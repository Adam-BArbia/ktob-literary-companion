package tn.ktob.reader;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.ApiException;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class ReaderService {
    private final JdbcTemplate db;

    public ReaderService(JdbcTemplate db) { this.db = db; }

    @Transactional
    public ReaderProfile findOrCreate(UUID owner) {
        db.update("""
            INSERT INTO app.reader_profiles(reader_id,display_name)
            VALUES (?, 'Reader') ON CONFLICT(reader_id) DO NOTHING
            """, owner);
        db.update("""
            INSERT INTO app.privacy_settings(reader_id)
            VALUES (?) ON CONFLICT(reader_id) DO NOTHING
            """, owner);
        return db.queryForObject("""
            SELECT reader_id,display_name FROM app.reader_profiles WHERE reader_id=?
            """, (rs,n)->new ReaderProfile(rs.getObject("reader_id", UUID.class),
                rs.getString("display_name")), owner);
    }

    @Transactional
    public ReaderProfile update(UUID owner, String displayName) {
        if (displayName == null || displayName.isBlank() ||
            displayName.length() > 100) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR",
                "Display name must contain 1 to 100 characters.");
        }
        findOrCreate(owner);
        db.update("""
            UPDATE app.reader_profiles SET display_name=?,updated_at=now()
            WHERE reader_id=?
            """, displayName.trim(), owner);
        return findOrCreate(owner);
    }
}
