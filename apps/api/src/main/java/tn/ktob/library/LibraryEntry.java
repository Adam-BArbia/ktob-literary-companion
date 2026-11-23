package tn.ktob.library;

import java.time.Instant;
import java.util.UUID;

/** Work status is derived from reading experiences, never independently stored. */
public record LibraryEntry(UUID id,UUID workId,UUID preferredEditionId,
    String shelfStatus,boolean favorite,boolean acquisitionIntention,
    Instant createdAt,Instant archivedAt) {}
