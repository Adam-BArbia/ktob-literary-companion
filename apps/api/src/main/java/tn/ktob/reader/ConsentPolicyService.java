package tn.ktob.reader;

import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.ktob.api.shared.ApiException;
import tn.ktob.api.shared.RequestFields;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class ConsentPolicyService {
    private static final Set<String> FIELDS=Set.of("aiProcessingOptIn","personalizationOptIn",
        "useReadingHistory","useAllowedJournal","useExplicitPreferences","useApprovedMemories");
    private final JdbcTemplate db;
    private final ReaderService readers;

    public ConsentPolicyService(JdbcTemplate db, ReaderService readers) {
        this.db=db; this.readers=readers;
    }

    public PrivacySettings get(UUID reader) {
        readers.findOrCreate(reader);
        return load(reader, false);
    }

    private PrivacySettings load(UUID reader, boolean lock) {
        return db.queryForObject("SELECT * FROM app.privacy_settings WHERE reader_id=?" +
            (lock ? " FOR UPDATE" : ""), (r,n)->new PrivacySettings(
                r.getBoolean("ai_processing_opt_in"),r.getBoolean("personalization_opt_in"),
                r.getBoolean("use_reading_history"),r.getBoolean("use_allowed_journal"),
                r.getBoolean("use_explicit_preferences"),r.getBoolean("use_approved_memories")), reader);
    }

    @Transactional
    public PrivacySettings update(UUID reader, String raw) {
        RequestFields p=RequestFields.parse(raw,FIELDS,Set.of());
        readers.findOrCreate(reader);
        PrivacySettings old=load(reader,true);
        db.update("""
            UPDATE app.privacy_settings SET ai_processing_opt_in=?,personalization_opt_in=?,
              use_reading_history=?,use_allowed_journal=?,use_explicit_preferences=?,use_approved_memories=?
            WHERE reader_id=?
            """, p.has("aiProcessingOptIn")?p.bool("aiProcessingOptIn"):old.aiProcessingOptIn(),
            p.has("personalizationOptIn")?p.bool("personalizationOptIn"):old.personalizationOptIn(),
            p.has("useReadingHistory")?p.bool("useReadingHistory"):old.useReadingHistory(),
            p.has("useAllowedJournal")?p.bool("useAllowedJournal"):old.useAllowedJournal(),
            p.has("useExplicitPreferences")?p.bool("useExplicitPreferences"):old.useExplicitPreferences(),
            p.has("useApprovedMemories")?p.bool("useApprovedMemories"):old.useApprovedMemories(),reader);
        return load(reader,false);
    }

    /** Fresh READ COMMITTED query, deliberately without a row lock across external inference. */
    public void requireProcessingConsent(UUID reader) {
        var values=db.query("SELECT ai_processing_opt_in FROM app.privacy_settings WHERE reader_id=?",
            (r,n)->r.getBoolean(1),reader);
        if(values.isEmpty() || !values.getFirst())
            throw new ApiException(HttpStatus.FORBIDDEN,"AI_PROCESSING_CONSENT_REQUIRED",
                "Choose whether to allow AI processing before sending a question.");
    }
}
