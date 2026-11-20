package tn.ktob.catalog;

import java.util.List;
import java.util.UUID;

/** Matches OpenAPI BookWork v0.3; ownerReaderId is absent for global work. */
public record BookWork(UUID id, String title, List<String> authors, String origin,
                       String language, String catalogReference, String metadataStatus,
                       UUID ownerReaderId) {}
