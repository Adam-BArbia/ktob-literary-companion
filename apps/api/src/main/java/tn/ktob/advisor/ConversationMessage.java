package tn.ktob.advisor;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

public record ConversationMessage(UUID id, UUID conversationId, String role, String body,
    Instant createdAt, SpoilerLevel spoilerLevel,
    @JsonInclude(JsonInclude.Include.NON_NULL) Boolean fullBookSpoilersConfirmed) {}
