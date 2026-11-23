package tn.ktob.journal;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.*;
import tn.ktob.library.LibraryService;
import tn.ktob.reading.ReadingService;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled",havingValue="true")
public class JournalService {
    private static final Set<String> FIELDS=Set.of("kind","body","emotionTags","allowForPersonalization");
    private static final Set<String> KINDS=Set.of("REVIEW","REFLECTION","QUOTE","NOTE","EMOTION");
    private static final String SELECT="""
        SELECT j.* FROM app.journal_entries j
        JOIN app.reading_experiences r ON r.id=j.experience_id
        JOIN app.library_entries e ON e.id=r.library_entry_id
        """;
    private final JdbcTemplate db;
    private final ReadingService readings;
    private final LibraryService library;

    public JournalService(JdbcTemplate db,ReadingService readings,LibraryService library){
        this.db=db;this.readings=readings;this.library=library;
    }

    private JournalEntry map(java.sql.ResultSet r,int ignored)throws java.sql.SQLException {
        return new JournalEntry(r.getObject("id",UUID.class),r.getObject("experience_id",UUID.class),
            r.getString("kind"),r.getString("body"),List.of((String[])r.getArray("emotion_tags").getArray()),
            r.getBoolean("allow_for_personalization"),r.getTimestamp("created_at").toInstant());
    }

    private JournalEntry get(UUID reader,UUID id){
        var rows=db.query(SELECT+" WHERE j.id=? AND e.reader_id=?",this::map,id,reader);
        if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Journal entry not found.");
        return rows.getFirst();
    }

    public ApiPage<JournalEntry> list(UUID reader,UUID experience,PageWindow page){
        readings.get(reader,experience);
        String scope="journal:"+reader+":"+experience;
        UUID anchor=KeysetCursor.decode(page.cursor(),scope);
        List<Object> args=new ArrayList<>(List.of(experience,reader));
        String sql=SELECT+" WHERE j.experience_id=? AND e.reader_id=?";
        if(anchor!=null){
            var rows=db.query("SELECT created_at FROM app.journal_entries WHERE id=? AND experience_id=?",
                (r,n)->r.getTimestamp(1),anchor,experience);
            if(rows.isEmpty())throw KeysetCursor.invalid();
            sql+=" AND (j.created_at,j.id) < (?,?)";args.add(rows.getFirst());args.add(anchor);
        }
        sql+=" ORDER BY j.created_at DESC,j.id DESC LIMIT ?";args.add(page.limit()+1);
        var rows=db.query(sql,this::map,args.toArray());
        boolean more=rows.size()>page.limit();
        List<JournalEntry> result=more?rows.subList(0,page.limit()):rows;
        return new ApiPage<>(result,new PageMeta(more?KeysetCursor.encode(scope,result.getLast().id()):null));
    }

    @Transactional
    public JournalEntry create(UUID reader,UUID experience,String body){
        var reading=readings.get(reader,experience);
        library.requireWritable(reader,reading.libraryEntryId());
        RequestFields fields=RequestFields.parse(body,FIELDS,Set.of("kind","body","allowForPersonalization"));
        String kind=fields.text("kind",false),text=fields.text("body",false);
        List<String> tags=fields.has("emotionTags")?fields.strings("emotionTags"):List.of();
        boolean allowed=fields.bool("allowForPersonalization");
        validate(kind,text,tags);
        UUID id=UUID.randomUUID();
        db.update(con->{
            var ps=con.prepareStatement("""
                INSERT INTO app.journal_entries(id,experience_id,kind,body,emotion_tags,allow_for_personalization)
                VALUES (?,?,?,?,?,?)
                """);
            ps.setObject(1,id);ps.setObject(2,experience);ps.setString(3,kind);ps.setString(4,text);
            ps.setArray(5,con.createArrayOf("text",tags.toArray(String[]::new)));ps.setBoolean(6,allowed);
            return ps;
        });
        return get(reader,id);
    }

    @Transactional
    public JournalEntry update(UUID reader,UUID id,String body){
        JournalEntry before=get(reader,id);
        var reading=readings.get(reader,before.experienceId());
        library.requireWritable(reader,reading.libraryEntryId());
        JournalEntry current=get(reader,id);
        RequestFields patch=RequestFields.parse(body,FIELDS,Set.of());
        String kind=patch.has("kind")?patch.text("kind",false):current.kind();
        String text=patch.has("body")?patch.text("body",false):current.body();
        List<String> tags=patch.has("emotionTags")?patch.strings("emotionTags"):current.emotionTags();
        boolean allowed=patch.has("allowForPersonalization")?patch.bool("allowForPersonalization"):current.allowForPersonalization();
        validate(kind,text,tags);
        db.update(con->{
            var ps=con.prepareStatement("""
                UPDATE app.journal_entries SET kind=?,body=?,emotion_tags=?,allow_for_personalization=?
                WHERE id=? AND experience_id=?
                """);
            ps.setString(1,kind);ps.setString(2,text);ps.setArray(3,con.createArrayOf("text",tags.toArray(String[]::new)));
            ps.setBoolean(4,allowed);ps.setObject(5,id);ps.setObject(6,current.experienceId());
            return ps;
        });
        return get(reader,id);
    }

    @Transactional
    public void delete(UUID reader,UUID id){
        JournalEntry current=get(reader,id);
        var reading=readings.get(reader,current.experienceId());
        library.requireWritable(reader,reading.libraryEntryId());
        // A competing deletion may have completed while waiting for the parent lock.
        get(reader,id);
        db.update("DELETE FROM app.journal_entries WHERE id=? AND experience_id=?",id,current.experienceId());
    }

    static void validate(String kind,String body,List<String> tags){
        if(!KINDS.contains(kind))throw RequestFields.invalid("Invalid journal kind.");
        if(body.isBlank() || body.length()>20000)throw RequestFields.invalid("Journal text must contain 1 to 20,000 characters.");
        if(tags.size()>12 || tags.stream().anyMatch(t->t.isBlank() || t.length()>40))
            throw RequestFields.invalid("Use at most 12 nonblank emotion tags, each up to 40 characters.");
    }
}
