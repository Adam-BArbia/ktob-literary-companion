package tn.ktob.reader;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.ktob.api.shared.ApiData;
import tn.ktob.security.ReaderIdentity;

@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class ReaderController {
    private final ReaderService readers;
    public ReaderController(ReaderService readers) { this.readers=readers; }

    @GetMapping(path="/api/v1/me", produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<ReaderProfile> me(Authentication auth) {
        return new ApiData<>(readers.findOrCreate(ReaderIdentity.from(auth)));
    }

    @PatchMapping(path="/api/v1/me", consumes=MediaType.APPLICATION_JSON_VALUE,
                  produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<ReaderProfile> update(@RequestBody Map<String,Object> patch,
                                         Authentication auth) {
        if (patch.size()!=1 || !(patch.get("displayName") instanceof String name)) {
            throw new tn.ktob.api.shared.ApiException(
                org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR", "Only displayName can be edited.");
        }
        return new ApiData<>(readers.update(ReaderIdentity.from(auth),name));
    }
}
