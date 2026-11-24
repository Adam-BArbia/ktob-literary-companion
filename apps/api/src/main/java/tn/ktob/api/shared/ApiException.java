package tn.ktob.api.shared;

import org.springframework.http.HttpStatus;

/**
 * Domain/API error that carries a safe public message and stable machine code.
 * Do not pass exception stack traces or sensitive persistence values as detail.
 */
public final class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Integer retryAfterSeconds;

    public ApiException(HttpStatus status, String code, String publicMessage) {
        this(status,code,publicMessage,null);
    }

    public ApiException(HttpStatus status, String code, String publicMessage, Integer retryAfterSeconds) {
        super(publicMessage);
        if (status == null || code == null || code.isBlank() ||
            publicMessage == null || publicMessage.isBlank()) {
            throw new IllegalArgumentException("status, code and publicMessage are required");
        }
        this.status = status;
        this.code = code;
        if(retryAfterSeconds!=null && (retryAfterSeconds<1 || retryAfterSeconds>86400))
            throw new IllegalArgumentException("Retry delay is out of bounds");
        this.retryAfterSeconds=retryAfterSeconds;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Integer retryAfterSeconds() { return retryAfterSeconds; }
}
