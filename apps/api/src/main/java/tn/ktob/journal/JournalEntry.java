package tn.ktob.journal;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JournalEntry(UUID id, UUID experienceId, String kind, String body,
    List<String> emotionTags, boolean allowForPersonalization, Instant createdAt) {
    public JournalEntry { emotionTags=List.copyOf(emotionTags); }
}
