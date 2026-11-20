package tn.ktob.api.shared;

/** A null nextCursor means no next page. */
public record PageMeta(String nextCursor) {}
