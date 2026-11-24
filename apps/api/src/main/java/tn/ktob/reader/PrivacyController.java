package tn.ktob.reader;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.ktob.api.shared.ApiData;
import tn.ktob.security.ReaderIdentity;

@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class PrivacyController {
    private final ConsentPolicyService consent;
    public PrivacyController(ConsentPolicyService consent) { this.consent=consent; }

    @GetMapping(path="/api/v1/me/privacy", produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<PrivacySettings> get(Authentication auth) {
        return new ApiData<>(consent.get(ReaderIdentity.from(auth)));
    }

    @PatchMapping(path="/api/v1/me/privacy", consumes=MediaType.APPLICATION_JSON_VALUE,
        produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<PrivacySettings> update(@RequestBody String body, Authentication auth) {
        return new ApiData<>(consent.update(ReaderIdentity.from(auth),body));
    }
}
