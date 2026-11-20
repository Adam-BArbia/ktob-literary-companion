package tn.ktob.api.shared;

import java.util.List;
import java.util.Objects;

/** OpenAPI list envelope: {"data": [...], "meta": {"nextCursor": null}}. */
public record ApiPage<T>(List<T> data, PageMeta meta) {
    public ApiPage {
        Objects.requireNonNull(data, "data");
        Objects.requireNonNull(meta, "meta");
        data = List.copyOf(data);
    }
}
