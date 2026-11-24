package tn.ktob.reader;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.ApiException;
import tn.ktob.api.shared.RequestFields;

/** Deliberate public projections. Never serialize private reader, library or journal records. */
@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public final class PublicReaderService {
    private static final Set<String> RESERVED = Set.of(
        "admin", "api", "auth", "books", "discover", "help", "home", "ktob", "login",
        "me", "privacy", "reader", "readers", "root", "settings", "signup", "support");
    private final JdbcTemplate db;
    private final ReaderService readers;

    public PublicReaderService(JdbcTemplate db, ReaderService readers) {
        this.db=db;this.readers=readers;
    }

    public record OwnProfile(String username, boolean discoverable) {}
    public record SearchHit(String username, String displayName) {}
    public record PublicRating(String title, List<String> authors, BigDecimal rating,
                               LocalDate finishedOn) {}
    public record PublicNote(String title, String kind, String body, Instant createdAt) {}
    public record PublicProfile(String username, String displayName,
                                List<PublicRating> ratings, List<PublicNote> notes) {}

    private OwnProfile own(UUID reader) {
        return db.queryForObject(
            "SELECT username,discoverable FROM app.reader_profiles WHERE reader_id=?",
            (rs,i)->new OwnProfile(rs.getString("username"),rs.getBoolean("discoverable")),reader);
    }

    @Transactional
    public OwnProfile getOwn(UUID reader) {
        readers.findOrCreate(reader);
        return own(reader);
    }

    @Transactional
    public OwnProfile configure(UUID reader, String raw) {
        var fields=RequestFields.parse(raw,Set.of("username","discoverable"),Set.of());
        readers.findOrCreate(reader);
        var rows=db.query("SELECT username,discoverable FROM app.reader_profiles WHERE reader_id=? FOR UPDATE",
            (rs,i)->new OwnProfile(rs.getString("username"),rs.getBoolean("discoverable")),reader);
        OwnProfile current=rows.getFirst();
        String username=current.username();
        if(fields.has("username")) {
            String supplied=fields.text("username",true);
            if(supplied!=null) {
                username=supplied.trim().toLowerCase(Locale.ROOT);
                if(!username.matches("[a-z][a-z0-9_]{2,23}") || RESERVED.contains(username))
                    throw RequestFields.invalid("Choose a username of 3–24 letters, numbers or underscores, starting with a letter.");
            } else username=null;
        }
        boolean visible=fields.has("discoverable")?fields.bool("discoverable"):current.discoverable();
        if(visible && username==null)throw RequestFields.invalid("Choose a username before making your profile discoverable.");
        try {
            db.update("UPDATE app.reader_profiles SET username=?,discoverable=?,updated_at=now() WHERE reader_id=?",
                username,visible,reader);
        } catch(DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT,"USERNAME_TAKEN","That username is already taken.");
        }
        return own(reader);
    }

    public List<SearchHit> search(String raw) {
        if(raw==null || raw.length()<2 || raw.length()>40)
            throw RequestFields.invalid("Search for at least two characters.");
        String q=raw.trim();
        if(!q.matches("[\\p{L}\\p{N}_ .-]{2,40}"))
            throw RequestFields.invalid("Use letters or numbers to search for readers.");
        // Only self-published handles are discoverable; email and UUID are never projected.
        return db.query("""
            SELECT username,display_name FROM app.reader_profiles
            WHERE discoverable AND username IS NOT NULL
              AND (username ILIKE ? OR display_name ILIKE ?)
            ORDER BY CASE WHEN username ILIKE ? THEN 0 ELSE 1 END,username
            LIMIT 20
            """,(rs,i)->new SearchHit(rs.getString(1),rs.getString(2)),
            q+"%",q+"%",q+"%");
    }

    public PublicProfile profile(String raw) {
        if(raw==null || !raw.matches("[A-Za-z][A-Za-z0-9_]{2,23}"))
            throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Reader not found.");
        String username=raw.toLowerCase(Locale.ROOT);
        var rows=db.query("""
            SELECT reader_id,username,display_name FROM app.reader_profiles
            WHERE username=? AND discoverable
            """,(rs,i)->new PublicRow(rs.getObject("reader_id",UUID.class),
                rs.getString("username"),rs.getString("display_name")),username);
        if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Reader not found.");
        PublicRow row=rows.getFirst();
        List<PublicRating> ratings=db.query("""
            SELECT DISTINCT ON (w.id) w.title,w.authors,r.rating,r.finished_on
            FROM app.reading_experiences r
            JOIN app.library_entries e ON e.id=r.library_entry_id
            JOIN app.catalog_works w ON w.id=e.work_id
            WHERE e.reader_id=? AND e.archived_at IS NULL AND
                  w.origin='OPEN_LIBRARY' AND r.rating_public AND r.rating IS NOT NULL
            ORDER BY w.id,r.created_at DESC,r.id DESC
            """,(rs,i)->new PublicRating(rs.getString("title"),authors(rs),
                rs.getBigDecimal("rating"),rs.getObject("finished_on",LocalDate.class)),row.id());
        List<PublicNote> notes=db.query("""
            SELECT w.title,j.kind,j.body,j.created_at FROM app.journal_entries j
            JOIN app.reading_experiences r ON r.id=j.experience_id
            JOIN app.library_entries e ON e.id=r.library_entry_id
            JOIN app.catalog_works w ON w.id=e.work_id
            WHERE e.reader_id=? AND e.archived_at IS NULL AND
                  w.origin='OPEN_LIBRARY' AND j.is_public
            ORDER BY j.created_at DESC,j.id DESC LIMIT 50
            """,(rs,i)->new PublicNote(rs.getString("title"),rs.getString("kind"),
                rs.getString("body"),rs.getTimestamp("created_at").toInstant()),row.id());
        return new PublicProfile(row.username(),row.displayName(),ratings,notes);
    }

    private static List<String> authors(java.sql.ResultSet rs) throws SQLException {
        return List.of((String[])rs.getArray("authors").getArray());
    }
    private record PublicRow(UUID id,String username,String displayName){}
}
