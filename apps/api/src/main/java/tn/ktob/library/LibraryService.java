package tn.ktob.library;

import java.util.List;
import java.util.UUID;
import java.time.Instant;
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
    private final JdbcTemplate db;
    private final CatalogService catalog;
    private final ReaderService readers;

    public LibraryService(JdbcTemplate db,CatalogService catalog,ReaderService readers) {
        this.db=db;this.catalog=catalog;this.readers=readers;
    }

    private LibraryEntry map(java.sql.ResultSet r,int ignored)throws java.sql.SQLException {
        Timestamp archived=r.getTimestamp("archived_at");
        return new LibraryEntry(r.getObject("id",UUID.class),r.getObject("work_id",UUID.class),
            r.getObject("preferred_edition_id",UUID.class),"WANT_TO_READ",
            r.getBoolean("favorite"),r.getBoolean("acquisition_intention"),
            r.getTimestamp("created_at").toInstant(),archived==null?null:archived.toInstant());
    }

    public LibraryEntry get(UUID reader,UUID entry) {
        List<LibraryEntry> rows=db.query("""
            SELECT * FROM app.library_entries WHERE id=? AND reader_id=?
            """,this::map,entry,reader);
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND",
            "Library entry not found.");
        return rows.getFirst();
    }

    @Transactional
    public LibraryEntry add(UUID reader,UUID work,UUID edition) {
        readers.findOrCreate(reader);
        catalog.find(work,reader); // private work owner check BEFORE inserting
        if(edition!=null){
            Integer exists=db.queryForObject("""
                SELECT count(*) FROM app.catalog_editions WHERE id=? AND work_id=?
                """,Integer.class,edition,work);
            if(exists==0)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                "INVALID_EDITION","Edition does not belong to this work.");
        }
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

    public ApiPage<LibraryEntry> list(UUID reader,PageWindow page,boolean includeArchived,
                                       String status) {
        if(status!=null && !status.equals("WANT_TO_READ")){
            // Other statuses will become queryable with reading experiences in Sprint 2.
            if(!List.of("CURRENTLY_READING","PAUSED","FINISHED","DID_NOT_FINISH").contains(status))
                throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_STATUS","Invalid shelf status.");
            return new ApiPage<>(List.of(),new PageMeta(null));
        }
        if(page.cursor()!=null)throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_CURSOR",
            "Library cursors are not yet enabled.");
        var entries=db.query("""
            SELECT * FROM app.library_entries WHERE reader_id=?
              AND (? OR archived_at IS NULL)
            ORDER BY created_at DESC,id DESC LIMIT ?
            """,this::map,reader,includeArchived,page.limit());
        return new ApiPage<>(entries,new PageMeta(null));
    }

    @Transactional
    public void archive(UUID reader,UUID entry) {
        get(reader,entry);
        db.update("UPDATE app.library_entries SET archived_at=COALESCE(archived_at,now()) WHERE reader_id=? AND id=?",
            reader,entry);
    }

    @Transactional
    public LibraryEntry restore(UUID reader,UUID entry) {
        get(reader,entry);
        db.update("UPDATE app.library_entries SET archived_at=NULL WHERE reader_id=? AND id=?",
            reader,entry);
        return get(reader,entry);
    }
}
