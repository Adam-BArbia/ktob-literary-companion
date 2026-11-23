package tn.ktob.reading;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.*;
import tn.ktob.library.LibraryService;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled",havingValue="true")
public class ReadingService {
    private static final Set<String> FIELDS=Set.of("editionId","status","startedOn","finishedOn","rating","progressPercent");
    private static final Set<String> CREATE_FIELDS=Set.of("editionId","status","startedOn","finishedOn","rating","progressPercent","historicalImport");
    private static final String SELECT="""
        SELECT r.* FROM app.reading_experiences r
        JOIN app.library_entries e ON e.id=r.library_entry_id
        """;
    private final JdbcTemplate db;
    private final LibraryService library;

    public ReadingService(JdbcTemplate db,LibraryService library){this.db=db;this.library=library;}

    private ReadingExperience map(java.sql.ResultSet r,int ignored)throws java.sql.SQLException {
        return new ReadingExperience(r.getObject("id",UUID.class),r.getObject("library_entry_id",UUID.class),
            r.getObject("edition_id",UUID.class),ReadingStatus.valueOf(r.getString("status")),
            r.getObject("started_on",LocalDate.class),r.getObject("finished_on",LocalDate.class),
            r.getBigDecimal("rating"),r.getObject("progress_percent",Integer.class));
    }

    public ReadingExperience get(UUID reader,UUID id){
        var rows=db.query(SELECT+" WHERE r.id=? AND e.reader_id=?",this::map,id,reader);
        if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Reading experience not found.");
        return rows.getFirst();
    }

    public ApiPage<ReadingExperience> list(UUID reader,UUID entry,PageWindow page){
        library.get(reader,entry);
        String scope="experiences:"+reader+":"+entry;
        UUID anchor=KeysetCursor.decode(page.cursor(),scope);
        List<Object> args=new ArrayList<>(List.of(entry,reader));
        String sql=SELECT+" WHERE r.library_entry_id=? AND e.reader_id=?";
        if(anchor!=null){
            var rows=db.query("SELECT created_at FROM app.reading_experiences WHERE id=? AND library_entry_id=?",
                (r,n)->r.getTimestamp(1),anchor,entry);
            if(rows.isEmpty())throw KeysetCursor.invalid();
            sql+=" AND (r.created_at,r.id) < (?,?)";args.add(rows.getFirst());args.add(anchor);
        }
        sql+=" ORDER BY r.created_at DESC,r.id DESC LIMIT ?";args.add(page.limit()+1);
        var rows=db.query(sql,this::map,args.toArray());
        boolean more=rows.size()>page.limit();
        List<ReadingExperience> result=more?rows.subList(0,page.limit()):rows;
        return new ApiPage<>(result,new PageMeta(more?KeysetCursor.encode(scope,result.getLast().id()):null));
    }

    @Transactional
    public ReadingExperience create(UUID reader,UUID entry,String body){
        var parent=library.requireWritable(reader,entry);
        RequestFields fields=RequestFields.parse(body,CREATE_FIELDS,Set.of("status"));
        ReadingStatus status=ReadingStatus.parse(fields.text("status",false));
        boolean historical=fields.has("historicalImport") && fields.bool("historicalImport");
        if(status!=ReadingStatus.CURRENTLY_READING && !historical)
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"HISTORICAL_IMPORT_REQUIRED",
                "Use historicalImport to log a past or paused reading.");
        UUID edition=fields.uuid("editionId");
        library.validateEdition(edition,parent.workId());
        ReadingExperience reading=new ReadingExperience(UUID.randomUUID(),entry,edition,status,
            fields.date("startedOn"),fields.date("finishedOn"),fields.decimal("rating"),fields.integer("progressPercent"));
        validate(reading);
        if(status.open()) ensureNoOpen(entry,null);
        try {
            db.update("""
                INSERT INTO app.reading_experiences
                (id,library_entry_id,work_id,edition_id,status,started_on,finished_on,rating,progress_percent)
                VALUES (?,?,?,?,?,?,?,?,?)
                """,reading.id(),entry,parent.workId(),edition,status.name(),reading.startedOn(),reading.finishedOn(),
                reading.rating(),reading.progressPercent());
        } catch(DuplicateKeyException ex){throw openConflict();}
        return get(reader,reading.id());
    }

    @Transactional
    public ReadingExperience update(UUID reader,UUID id,String body){
        ReadingExperience before=get(reader,id);
        var parent=library.requireWritable(reader,before.libraryEntryId());
        // Re-read after the parent lock, so simultaneous PATCHes merge with the latest committed row.
        ReadingExperience current=get(reader,id);
        RequestFields patch=RequestFields.parse(body,FIELDS,Set.of());
        ReadingStatus status=patch.has("status")?ReadingStatus.parse(patch.text("status",false)):current.status();
        if(!current.status().open() && status!=current.status())
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_READING_TRANSITION",
                "A finished reading cannot be reopened. Start a new reading to read again.");
        ReadingExperience merged=new ReadingExperience(id,current.libraryEntryId(),
            patch.has("editionId")?patch.uuid("editionId"):current.editionId(),status,
            patch.has("startedOn")?patch.date("startedOn"):current.startedOn(),
            patch.has("finishedOn")?patch.date("finishedOn"):current.finishedOn(),
            patch.has("rating")?patch.decimal("rating"):current.rating(),
            patch.has("progressPercent")?patch.integer("progressPercent"):current.progressPercent());
        validate(merged);
        library.validateEdition(merged.editionId(),parent.workId());
        if(status.open())ensureNoOpen(current.libraryEntryId(),id);
        db.update("""
            UPDATE app.reading_experiences SET edition_id=?,status=?,started_on=?,finished_on=?,rating=?,progress_percent=?
            WHERE id=? AND library_entry_id=?
            """,merged.editionId(),status.name(),merged.startedOn(),merged.finishedOn(),merged.rating(),
            merged.progressPercent(),id,current.libraryEntryId());
        return get(reader,id);
    }

    private void ensureNoOpen(UUID entry,UUID except){
        Long count=except==null?db.queryForObject("""
            SELECT count(*) FROM app.reading_experiences WHERE library_entry_id=?
            AND status IN ('CURRENTLY_READING','PAUSED')
            """,Long.class,entry):db.queryForObject("""
            SELECT count(*) FROM app.reading_experiences WHERE library_entry_id=? AND id<>?
            AND status IN ('CURRENTLY_READING','PAUSED')
            """,Long.class,entry,except);
        if(count!=null && count>0)throw openConflict();
    }

    private static ApiException openConflict(){
        return new ApiException(HttpStatus.CONFLICT,"READING_ALREADY_OPEN",
            "This book already has an open reading. Finish it before starting another.");
    }

    static void validate(ReadingExperience reading){
        BigDecimal rating=reading.rating();
        if(rating!=null && (rating.compareTo(BigDecimal.ONE)<0 || rating.compareTo(new BigDecimal("5"))>0 ||
            rating.remainder(new BigDecimal("0.5")).compareTo(BigDecimal.ZERO)!=0))
            throw RequestFields.invalid("Rating must be 1 to 5 in half-star increments, or null.");
        if(reading.progressPercent()!=null && (reading.progressPercent()<0 || reading.progressPercent()>100))
            throw RequestFields.invalid("Progress must be a whole number between 0 and 100, or null.");
        if(reading.startedOn()!=null && reading.finishedOn()!=null && reading.finishedOn().isBefore(reading.startedOn()))
            throw RequestFields.invalid("The finishing date cannot be before the starting date.");
    }
}
