package tn.ktob.journal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JournalEntry(UUID id, UUID experienceId, String kind, String body,
    List<String> emotionTags, boolean allowForPersonalization, Instant createdAt, boolean isPublic) {
    // Existing journal constructors remain valid and private by default.
    public JournalEntry(UUID id, UUID experienceId, String kind, String body,
            List<String> emotionTags, boolean allowForPersonalization, Instant createdAt) {
        this(id,experienceId,kind,body,emotionTags,allowForPersonalization,createdAt,false);
    }
    public JournalEntry { emotionTags=List.copyOf(emotionTags); }
}
