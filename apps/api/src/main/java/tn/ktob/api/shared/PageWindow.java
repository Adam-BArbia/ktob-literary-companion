package tn.ktob.api.shared;

import org.springframework.http.HttpStatus;

/**
 * Bounded pagination inputs. Database queries independently validate their opaque
 * anchor against the authenticated reader/list; a cursor is never a SQL offset.
 */
public record PageWindow(int limit, String cursor) {
    public static final int DEFAULT_LIMIT = 25;
    public static final int MAX_LIMIT = 100;
    public static final int MAX_CURSOR_LENGTH = 1024;

    public static PageWindow of(Integer requestedLimit, String cursor) {
        int limit = requestedLimit == null ? DEFAULT_LIMIT : requestedLimit;
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION",
                "Pagination limit must be between 1 and 100.");
        }
        if (cursor != null && (cursor.isBlank() || cursor.length() > MAX_CURSOR_LENGTH
                || cursor.chars().anyMatch(Character::isISOControl))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURSOR", "Cursor is invalid.");
        }
        return new PageWindow(limit, cursor);
    }
}
