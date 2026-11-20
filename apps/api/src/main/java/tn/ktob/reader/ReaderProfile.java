package tn.ktob.reader;

import java.util.UUID;

/** Reader-facing R1 profile; no public profile or implicit AI consent. */
public record ReaderProfile(UUID id, String displayName) {}
