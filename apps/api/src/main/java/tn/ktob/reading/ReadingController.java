package tn.ktob.reading;

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
public class ReadingController {
    private final ReadingService readings;
    public ReadingController(ReadingService readings){this.readings=readings;}

    @GetMapping(path="/api/v1/library/{entryId}/experiences",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<ReadingExperience> listMyReadingExperiences(@PathVariable String entryId,
            @RequestParam(required=false) Integer limit,@RequestParam(required=false) String cursor,
            Authentication auth){
        return readings.list(ReaderIdentity.from(auth),UuidValue.parse(entryId),PageWindow.of(limit,cursor));
    }

    @PostMapping(path="/api/v1/library/{entryId}/experiences",consumes=MediaType.APPLICATION_JSON_VALUE,
                 produces=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiData<ReadingExperience>> createMyReadingExperience(@PathVariable String entryId,
            @RequestBody String body,Authentication auth){
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiData<>(
            readings.create(ReaderIdentity.from(auth),UuidValue.parse(entryId),body)));
    }

    @GetMapping(path="/api/v1/experiences/{experienceId}",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<ReadingExperience> getMyReadingExperience(@PathVariable String experienceId,Authentication auth){
        return new ApiData<>(readings.get(ReaderIdentity.from(auth),UuidValue.parse(experienceId)));
    }

    @PatchMapping(path="/api/v1/experiences/{experienceId}",consumes=MediaType.APPLICATION_JSON_VALUE,
                  produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<ReadingExperience> updateMyReadingExperience(@PathVariable String experienceId,
            @RequestBody String body,Authentication auth){
        return new ApiData<>(readings.update(ReaderIdentity.from(auth),UuidValue.parse(experienceId),body));
    }
}
