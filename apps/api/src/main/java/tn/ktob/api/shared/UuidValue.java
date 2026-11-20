package tn.ktob.api.shared;

import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

/** Strict, canonical UUID path value parser; never accept abbreviated UUIDs. */
public final class UuidValue {
    private static final Pattern UUID_PATTERN = Pattern.compile(
        "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$");

    private UuidValue() {}

    public static UUID parse(String raw) {
        if (raw == null || !UUID_PATTERN.matcher(raw).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_UUID", "Invalid UUID identifier.");
        }
        return UUID.fromString(raw);
    }
}
