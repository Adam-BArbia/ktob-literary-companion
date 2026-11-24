package tn.ktob.catalog;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import tn.ktob.api.shared.ApiData;
import tn.ktob.api.shared.UuidValue;
import tn.ktob.security.ReaderIdentity;

/** Community previews are for signed-in KTOB readers, never anonymous browsing. */
@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public final class BookCommunityController {
    private final BookCommunityService community;
    public BookCommunityController(BookCommunityService community) {
        this.community = community;
    }

    @GetMapping(path="/api/v1/catalog/works/{workId}/community",
        produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<BookCommunityService.CommunityPreview> preview(
            @PathVariable String workId, Authentication authentication) {
        // Require a verified user; do not allow direct unauthenticated lookups.
        ReaderIdentity.from(authentication);
        return new ApiData<>(community.preview(UuidValue.parse(workId)));
    }
}
