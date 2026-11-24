package tn.ktob.advisor;

import org.springframework.http.HttpStatus;
import tn.ktob.api.shared.ApiException;
import tn.ktob.api.shared.RequestFields;

/** Per-turn permission, never inferred from the conversation or a past request. */
public final class SpoilerPolicyService {
    private SpoilerPolicyService() {}
    public static SpoilerLevel validate(RequestFields fields) {
        SpoilerLevel level=SpoilerLevel.NO_SPOILERS;
        if(fields.has("spoilerLevel")) {
            try { level=SpoilerLevel.valueOf(fields.text("spoilerLevel",false)); }
            catch(IllegalArgumentException ex) { throw RequestFields.invalid("Invalid spoiler level."); }
        }
        boolean confirmed=fields.has("fullBookSpoilersConfirmed") && fields.bool("fullBookSpoilersConfirmed");
        if(confirmed != (level==SpoilerLevel.FULL_BOOK_SPOILERS))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"SPOILER_CONFIRMATION_REQUIRED",
                "Full-book spoilers require explicit confirmation for this question only.");
        return level;
    }
}
