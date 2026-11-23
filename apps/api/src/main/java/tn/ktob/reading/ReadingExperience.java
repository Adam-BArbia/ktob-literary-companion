package tn.ktob.reading;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** The public OpenAPI DTO deliberately omits internal creation time and work FK. */
public record ReadingExperience(UUID id, UUID libraryEntryId, UUID editionId,
    ReadingStatus status, LocalDate startedOn, LocalDate finishedOn,
    BigDecimal rating, Integer progressPercent) {}
