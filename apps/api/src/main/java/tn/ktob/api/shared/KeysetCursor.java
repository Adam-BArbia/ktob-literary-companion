package tn.ktob.api.shared;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/** Opaque anchor scoped to the authenticated reader, resource and list filters.
 * The database must independently verify that its anchor belongs to that scope.
 * No SQL offset, trusted client timestamp, or authorization claim comes from it. */
public final class KeysetCursor {
    private KeysetCursor() {}

    public static String encode(String scope, UUID id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
            ("v1:" + digest(scope) + ":" + id).getBytes(StandardCharsets.UTF_8));
    }

    public static UUID decode(String cursor, String scope) {
        if (cursor == null) return null;
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", -1);
            if (parts.length != 3 || !parts[0].equals("v1") || !parts[1].equals(digest(scope)))
                throw invalid();
            return UuidValue.parse(parts[2]);
        } catch (RuntimeException ex) { throw invalid(); }
    }

    public static ApiException invalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "Cursor is invalid for this list.");
    }

    private static String digest(String scope) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
            .digest(scope.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
