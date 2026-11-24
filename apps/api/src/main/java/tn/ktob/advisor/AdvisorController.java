package tn.ktob.advisor;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.ktob.api.shared.*;
import tn.ktob.security.ReaderIdentity;

@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class AdvisorController {
    private final AdvisorService advisor;
    public AdvisorController(AdvisorService advisor) { this.advisor=advisor; }

    @GetMapping(path="/api/v1/conversations", produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<Conversation> list(@RequestParam(defaultValue="25") int limit,
            @RequestParam(required=false) String cursor,Authentication auth) {
        return advisor.list(ReaderIdentity.from(auth),new PageWindow(limit,cursor));
    }
    @PostMapping(path="/api/v1/conversations", consumes=MediaType.APPLICATION_JSON_VALUE,
        produces=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiData<Conversation> create(@RequestBody String body,Authentication auth) {
        return new ApiData<>(advisor.create(ReaderIdentity.from(auth),body));
    }
    @GetMapping(path="/api/v1/conversations/{conversationId}/messages", produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<ConversationMessage> messages(@PathVariable UUID conversationId,
            @RequestParam(defaultValue="25") int limit,@RequestParam(required=false) String cursor,Authentication auth) {
        return advisor.messages(ReaderIdentity.from(auth),conversationId,new PageWindow(limit,cursor));
    }
    @PostMapping(path="/api/v1/conversations/{conversationId}/messages", consumes=MediaType.APPLICATION_JSON_VALUE,
        produces=MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiData<ConversationTurn> send(@PathVariable UUID conversationId,@RequestBody String body,
            @RequestHeader(name="Idempotency-Key",required=false) String key,Authentication auth) {
        return new ApiData<>(advisor.send(ReaderIdentity.from(auth),conversationId,body,key));
    }
}
