package tn.ktob.journal;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tn.ktob.api.shared.*;
import tn.ktob.security.ReaderIdentity;

@RestController
@ConditionalOnProperty(name="ktob.persistence.enabled",havingValue="true")
public class JournalController {
    private final JournalService journal;
    public JournalController(JournalService journal){this.journal=journal;}

    @GetMapping(path="/api/v1/experiences/{experienceId}/journal",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<JournalEntry> listMyJournalEntries(@PathVariable String experienceId,
            @RequestParam(required=false) Integer limit,@RequestParam(required=false) String cursor,
            Authentication auth){
        return journal.list(ReaderIdentity.from(auth),UuidValue.parse(experienceId),PageWindow.of(limit,cursor));
    }

    @PostMapping(path="/api/v1/experiences/{experienceId}/journal",consumes=MediaType.APPLICATION_JSON_VALUE,
                 produces=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiData<JournalEntry>> createMyJournalEntry(@PathVariable String experienceId,
            @RequestBody String body,Authentication auth){
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiData<>(
            journal.create(ReaderIdentity.from(auth),UuidValue.parse(experienceId),body)));
    }

    @PatchMapping(path="/api/v1/journal/{journalId}",consumes=MediaType.APPLICATION_JSON_VALUE,
                  produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<JournalEntry> updateMyJournalEntry(@PathVariable String journalId,
            @RequestBody String body,Authentication auth){
        return new ApiData<>(journal.update(ReaderIdentity.from(auth),UuidValue.parse(journalId),body));
    }

    @DeleteMapping(path="/api/v1/journal/{journalId}")
    public ResponseEntity<Void> deleteMyJournalEntry(@PathVariable String journalId,Authentication auth){
        journal.delete(ReaderIdentity.from(auth),UuidValue.parse(journalId));
        return ResponseEntity.noContent().build();
    }
}
