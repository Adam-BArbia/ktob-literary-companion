package tn.ktob.api.shared;

import java.util.Objects;

/** OpenAPI object envelope: {"data": {...}}. */
public record ApiData<T>(T data) {
    public ApiData {
        Objects.requireNonNull(data, "data");
    }
}
