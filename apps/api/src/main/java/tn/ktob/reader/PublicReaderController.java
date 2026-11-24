package tn.ktob.reader;

import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.ktob.api.shared.ApiData;
import tn.ktob.security.ReaderIdentity;

/** Signed-in reader discovery. Only deliberately discoverable profiles are projected. */
@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public final class PublicReaderController {
    private final PublicReaderService service;
    public PublicReaderController(PublicReaderService service) { this.service=service; }

    @GetMapping(path="/api/v1/me/public-profile",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<PublicReaderService.OwnProfile> own(Authentication auth) {
        return new ApiData<>(service.getOwn(ReaderIdentity.from(auth)));
    }

    @PatchMapping(path="/api/v1/me/public-profile",consumes=MediaType.APPLICATION_JSON_VALUE,
                  produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<PublicReaderService.OwnProfile> configure(
            Authentication auth,@RequestBody String body) {
        return new ApiData<>(service.configure(ReaderIdentity.from(auth),body));
    }

    @GetMapping(path="/api/v1/readers/search",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<List<PublicReaderService.SearchHit>> search(@RequestParam String q) {
        return new ApiData<>(service.search(q));
    }

    @GetMapping(path="/api/v1/readers/{username}",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<PublicReaderService.PublicProfile> profile(@PathVariable String username) {
        return new ApiData<>(service.profile(username));
    }
}
