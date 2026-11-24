package tn.ktob.advisor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Set;
import tn.ktob.api.shared.RequestFields;
import tools.jackson.databind.json.JsonMapper;

public record MessageRequest(String body, SpoilerLevel spoilerLevel, boolean fullBookSpoilersConfirmed) {
    public static MessageRequest parse(String raw) {
        var fields=RequestFields.parse(raw,Set.of("body","spoilerLevel","fullBookSpoilersConfirmed"),Set.of("body"));
        String body=fields.text("body",false);
        if(body.isBlank() || body.length()>12000)
            throw RequestFields.invalid("Question must contain 1 to 12000 characters.");
        SpoilerLevel level=SpoilerPolicyService.validate(fields);
        return new MessageRequest(body,level,level==SpoilerLevel.FULL_BOOK_SPOILERS);
    }

    /** JSON field order and omitted defaults do not make a different logical operation. */
    public String fingerprint() {
        try {
            byte[] canonical=new JsonMapper().writeValueAsString(this).getBytes(StandardCharsets.UTF_8);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical));
        } catch(java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
