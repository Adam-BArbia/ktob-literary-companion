package tn.ktob.advisor;

import java.time.Instant;
import java.util.UUID;

public record Conversation(UUID id, String kind, UUID workId, String title, Instant createdAt) {}
