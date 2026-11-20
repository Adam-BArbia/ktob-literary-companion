package tn.ktob.library;

import java.util.UUID;
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
public class LibraryController {
    private final LibraryService library;
    public LibraryController(LibraryService library){this.library=library;}

    public record LibraryCreate(UUID workId,UUID preferredEditionId){}

    @GetMapping(path="/api/v1/library",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<LibraryEntry> list(@RequestParam(required=false) Integer limit,
              @RequestParam(required=false) String cursor,
              @RequestParam(required=false) String status,
              @RequestParam(defaultValue="false") boolean includeArchived,
              Authentication auth){
        return library.list(ReaderIdentity.from(auth),PageWindow.of(limit,cursor),includeArchived,status);
    }

    @PostMapping(path="/api/v1/library",consumes=MediaType.APPLICATION_JSON_VALUE,
                 produces=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiData<LibraryEntry>> add(@RequestBody LibraryCreate create,
                                                      Authentication auth){
        if(create.workId()==null) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR","workId is required.");
        var entry=library.add(ReaderIdentity.from(auth),create.workId(),create.preferredEditionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiData<>(entry));
    }

    @GetMapping(path="/api/v1/library/{entryId}",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<LibraryEntry> one(@PathVariable String entryId,Authentication auth){
        return new ApiData<>(library.get(ReaderIdentity.from(auth),UuidValue.parse(entryId)));
    }

    @DeleteMapping(path="/api/v1/library/{entryId}")
    public ResponseEntity<Void> archive(@PathVariable String entryId,Authentication auth) {
        library.archive(ReaderIdentity.from(auth),UuidValue.parse(entryId));
        return ResponseEntity.noContent().build();
    }

    @PostMapping(path="/api/v1/library/{entryId}/restore",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<LibraryEntry> restore(@PathVariable String entryId,Authentication auth) {
        return new ApiData<>(library.restore(ReaderIdentity.from(auth),UuidValue.parse(entryId)));
    }
}
