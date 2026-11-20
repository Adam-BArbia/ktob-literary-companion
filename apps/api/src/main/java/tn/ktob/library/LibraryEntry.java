package tn.ktob.library;

import java.time.Instant;
import java.util.UUID;

/** Work status is a projection: no reading experiences means WANT_TO_READ. */
public record LibraryEntry(UUID id,UUID workId,UUID preferredEditionId,
    String shelfStatus,boolean favorite,boolean acquisitionIntention,
    Instant createdAt,Instant archivedAt) {}
