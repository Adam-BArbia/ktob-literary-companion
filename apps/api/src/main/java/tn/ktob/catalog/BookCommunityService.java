package tn.ktob.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tn.ktob.api.shared.ApiException;

/**
 * Authenticated, owner-consented community projections for canonical Open Library works.
 * Never expose raw reader IDs, private manual works, private notes or hidden profiles.
 */
@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public final class BookCommunityService {
    private final JdbcTemplate db;
    private final TransactionTemplate snapshot;

    public BookCommunityService(JdbcTemplate db, PlatformTransactionManager manager) {
        this.db = db;
        snapshot = new TransactionTemplate(manager);
        snapshot.setReadOnly(true);
        snapshot.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        snapshot.setTimeout(15);
    }

    public record CommunityRating(String username, String displayName, BigDecimal rating) {}
    public record CommunityNote(String username, String displayName, String kind,
                                String body, Instant createdAt) {}
    public record CommunityPreview(UUID workId, BigDecimal averageRating, int ratingCount,
                                   List<CommunityRating> ratings, List<CommunityNote> notes) {}

    public CommunityPreview preview(UUID workId) {
        // All projections use one database snapshot, so a concurrent publishing
        // change cannot produce a count, average and list from different states.
        // There is no cache: a completed revocation is visible on the next request.
        return snapshot.execute(status -> readPreview(workId));
    }

    private CommunityPreview readPreview(UUID workId) {
        Boolean sourced = db.query("""
            SELECT origin='OPEN_LIBRARY' AND owner_reader_id IS NULL
            FROM app.catalog_works WHERE id=?
            """, rs -> rs.next() ? rs.getBoolean(1) : null, workId);
        if (!Boolean.TRUE.equals(sourced)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND",
                "This book does not have a community preview.");
        }

        // One latest rating per reader/work, regardless of whether that latest score
        // is public. Filtering AFTER selection prevents resurfacing an older public
        // score when its owner makes the newer rating private.
        List<CommunityRating> ratings = db.query("""
            WITH newest AS (
              SELECT DISTINCT ON (e.reader_id)
                e.reader_id, r.rating, r.rating_public
              FROM app.reading_experiences r
              JOIN app.library_entries e ON e.id=r.library_entry_id
              WHERE e.work_id=? AND e.archived_at IS NULL
              ORDER BY e.reader_id, r.created_at DESC, r.id DESC
            )
            SELECT p.username, p.display_name, n.rating FROM newest n
            JOIN app.reader_profiles p ON p.reader_id=n.reader_id
            WHERE n.rating_public AND n.rating IS NOT NULL AND p.discoverable AND p.username IS NOT NULL
            ORDER BY n.rating DESC, p.username
            LIMIT 200
            """, (rs,i) -> new CommunityRating(rs.getString("username"),
                rs.getString("display_name"), rs.getBigDecimal("rating")), workId);

        // Compute aggregate over ALL eligible readers, not merely display page.
        BigDecimal average = db.queryForObject("""
            WITH newest AS (
              SELECT DISTINCT ON (e.reader_id)
                e.reader_id,r.rating,r.rating_public
              FROM app.reading_experiences r
              JOIN app.library_entries e ON e.id=r.library_entry_id
              WHERE e.work_id=? AND e.archived_at IS NULL
              ORDER BY e.reader_id,r.created_at DESC,r.id DESC
            )
            SELECT AVG(n.rating) FROM newest n
            JOIN app.reader_profiles p ON p.reader_id=n.reader_id
            WHERE n.rating_public AND n.rating IS NOT NULL AND p.discoverable AND p.username IS NOT NULL
            """, BigDecimal.class, workId);
        Integer count = db.queryForObject("""
            WITH newest AS (
              SELECT DISTINCT ON (e.reader_id)
                e.reader_id,r.rating,r.rating_public
              FROM app.reading_experiences r
              JOIN app.library_entries e ON e.id=r.library_entry_id
              WHERE e.work_id=? AND e.archived_at IS NULL
              ORDER BY e.reader_id,r.created_at DESC,r.id DESC
            )
            SELECT count(*) FROM newest n
            JOIN app.reader_profiles p ON p.reader_id=n.reader_id
            WHERE n.rating_public AND n.rating IS NOT NULL AND p.discoverable AND p.username IS NOT NULL
            """, Integer.class, workId);

        List<CommunityNote> notes = db.query("""
            SELECT p.username,p.display_name,j.kind,j.body,j.created_at
            FROM app.journal_entries j
            JOIN app.reading_experiences r ON r.id=j.experience_id
            JOIN app.library_entries e ON e.id=r.library_entry_id
            JOIN app.reader_profiles p ON p.reader_id=e.reader_id
            WHERE e.work_id=? AND e.archived_at IS NULL
              AND p.discoverable AND p.username IS NOT NULL AND j.is_public
            ORDER BY j.created_at DESC,j.id DESC
            LIMIT 30
            """, (rs,i) -> new CommunityNote(rs.getString("username"),
                rs.getString("display_name"),rs.getString("kind"),
                rs.getString("body"),rs.getTimestamp("created_at").toInstant()), workId);
        return new CommunityPreview(workId,
            average==null?null:average.setScale(1,RoundingMode.HALF_UP),
            count==null?0:count, List.copyOf(ratings), List.copyOf(notes));
    }
}
