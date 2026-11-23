package tn.ktob.library;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.sql.Timestamp;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.*;
import tn.ktob.catalog.CatalogService;
import tn.ktob.reader.ReaderService;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled",havingValue="true")
public class LibraryService {
    private static final String SELECT = """
        SELECT e.*,COALESCE((
            SELECT r.status FROM app.reading_experiences r WHERE r.library_entry_id=e.id
            ORDER BY CASE WHEN r.status IN ('CURRENTLY_READING','PAUSED') THEN 0 ELSE 1 END,
                     COALESCE(r.finished_on,r.started_on) DESC NULLS LAST,
                     r.created_at DESC,r.id DESC LIMIT 1
        ),'WANT_TO_READ') AS shelf_status FROM app.library_entries e
        """;
    private final JdbcTemplate db;
    private final CatalogService catalog;
    private final ReaderService readers;

    public LibraryService(JdbcTemplate db,CatalogService catalog,ReaderService readers) {
        this.db=db;this.catalog=catalog;this.readers=readers;
    }

    private LibraryEntry map(java.sql.ResultSet r,int ignored)throws java.sql.SQLException {
        Timestamp archived=r.getTimestamp("archived_at");
        return new LibraryEntry(r.getObject("id",UUID.class),r.getObject("work_id",UUID.class),
            r.getObject("preferred_edition_id",UUID.class),r.getString("shelf_status"),
            r.getBoolean("favorite"),r.getBoolean("acquisition_intention"),
            r.getTimestamp("created_at").toInstant(),archived==null?null:archived.toInstant());
    }

    public LibraryEntry get(UUID reader,UUID entry) { return owned(reader,entry,false); }

    /** Call in a write transaction. Every parent/child mutation locks the parent first. */
    public LibraryEntry lockOwned(UUID reader,UUID entry) { return owned(reader,entry,true); }

    private LibraryEntry owned(UUID reader,UUID entry,boolean lock) {
        List<LibraryEntry> rows=db.query(SELECT + " WHERE e.id=? AND e.reader_id=?" +
            (lock ? " FOR UPDATE OF e" : ""),this::map,entry,reader);
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Library entry not found.");
        return rows.getFirst();
    }

    public LibraryEntry requireWritable(UUID reader,UUID entry) {
        LibraryEntry result=lockOwned(reader,entry);
        if(result.archivedAt()!=null) throw new ApiException(HttpStatus.CONFLICT,
            "LIBRARY_ENTRY_ARCHIVED","Restore this book before making changes.");
        return result;
    }

    public void validateEdition(UUID edition,UUID work) {
        if(edition!=null && db.queryForObject("""
            SELECT count(*) FROM app.catalog_editions WHERE id=? AND work_id=?
            """,Integer.class,edition,work)==0)
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_EDITION","Edition does not belong to this work.");
    }

    @Transactional
    public LibraryEntry add(UUID reader,UUID work,UUID edition) {
        readers.findOrCreate(reader);
        catalog.find(work,reader);
        validateEdition(edition,work);
        UUID entry=UUID.randomUUID();
        try {
            db.update("""
                INSERT INTO app.library_entries(id,reader_id,work_id,preferred_edition_id)
                VALUES (?,?,?,?)
                """,entry,reader,work,edition);
        }catch(DuplicateKeyException e){
            throw new ApiException(HttpStatus.CONFLICT,"LIBRARY_DUPLICATE",
                "This work is already in your library; restore it if archived.");
        }
        return get(reader,entry);
    }

    @Transactional
    public LibraryEntry update(UUID reader,UUID entry,String body) {
        LibraryEntry current=requireWritable(reader,entry);
        RequestFields patch=RequestFields.parse(body,Set.of("favorite","acquisitionIntention","preferredEditionId"),Set.of());
        boolean favorite=patch.has("favorite")?patch.bool("favorite"):current.favorite();
        boolean acquisition=patch.has("acquisitionIntention")?patch.bool("acquisitionIntention"):current.acquisitionIntention();
        UUID edition=patch.has("preferredEditionId")?patch.uuid("preferredEditionId"):current.preferredEditionId();
        validateEdition(edition,current.workId());
        db.update("""
            UPDATE app.library_entries SET favorite=?,acquisition_intention=?,preferred_edition_id=?
            WHERE id=? AND reader_id=?
            """,favorite,acquisition,edition,entry,reader);
        return get(reader,entry);
    }

    public ApiPage<LibraryEntry> list(UUID reader,PageWindow page,boolean includeArchived,String status) {
        if(status!=null && !List.of("WANT_TO_READ","CURRENTLY_READING","PAUSED","FINISHED","DID_NOT_FINISH").contains(status))
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_STATUS","Invalid shelf status.");
        String scope="library:"+reader+":"+includeArchived+":"+status;
        UUID anchor=KeysetCursor.decode(page.cursor(),scope);
        List<Object> args=new ArrayList<>();
        args.add(reader);args.add(includeArchived);
        String where=" WHERE e.reader_id=? AND (? OR e.archived_at IS NULL)";
        if(anchor!=null){
            var anchors=db.query("SELECT created_at FROM app.library_entries WHERE id=? AND reader_id=?",
                (r,n)->r.getTimestamp(1),anchor,reader);
            if(anchors.isEmpty())throw KeysetCursor.invalid();
            where+=" AND (e.created_at,e.id) < (?,?)";
            args.add(anchors.getFirst());args.add(anchor);
        }
        String sql="SELECT * FROM ("+SELECT+where+") projected";
        if(status!=null){sql+=" WHERE shelf_status=?";args.add(status);}
        sql+=" ORDER BY created_at DESC,id DESC LIMIT ?";args.add(page.limit()+1);
        var rows=db.query(sql,this::map,args.toArray());
        boolean more=rows.size()>page.limit();
        List<LibraryEntry> result=more?rows.subList(0,page.limit()):rows;
        String next=more?KeysetCursor.encode(scope,result.getLast().id()):null;
        return new ApiPage<>(result,new PageMeta(next));
    }

    @Transactional
    public void archive(UUID reader,UUID entry) {
        lockOwned(reader,entry);
        db.update("UPDATE app.library_entries SET archived_at=COALESCE(archived_at,now()) WHERE reader_id=? AND id=?",reader,entry);
    }

    @Transactional
    public LibraryEntry restore(UUID reader,UUID entry) {
        lockOwned(reader,entry);
        db.update("UPDATE app.library_entries SET archived_at=NULL WHERE reader_id=? AND id=?",reader,entry);
        return get(reader,entry);
    }
}
