package tn.ktob.security;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import tn.ktob.api.shared.ApiException;

/** The reader identity always comes from the verified access token, not a request body. */
public final class ReaderIdentity {
    private ReaderIdentity() {}

    public static UUID from(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt) ||
            !authentication.isAuthenticated()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                "Authentication is required.");
        }
        try {
            return UUID.fromString(jwt.getToken().getSubject());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED",
                "Invalid user identity.");
        }
    }
}
