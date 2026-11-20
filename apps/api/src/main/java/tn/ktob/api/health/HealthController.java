package tn.ktob.api.health;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public API liveness endpoint. No authentication or external dependency required. */
@RestController
public class HealthController {

    private static final HealthResponse OK = new HealthResponse("ok");

    @GetMapping(path = "/api/v1/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public HealthResponse liveness() {
        return OK;
    }
}
