package tn.ktob.catalog;

import java.util.List;
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
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog){this.catalog=catalog;}

    public record ManualWorkWrite(String title,List<String> authors,String language){}

    @GetMapping(path="/api/v1/catalog/works",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiPage<BookWork> search(@RequestParam(required=false) String q,
            @RequestParam(required=false) Integer limit,@RequestParam(required=false) String cursor,
            Authentication auth) {
        PageWindow w=PageWindow.of(limit,cursor);
        if(w.cursor()!=null) throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_CURSOR",
            "Catalog result cursors are not yet available.");
        return new ApiPage<>(catalog.search(ReaderIdentity.from(auth),q,w.limit()),
            new PageMeta(null));
    }

    @GetMapping(path="/api/v1/catalog/works/{workId}",produces=MediaType.APPLICATION_JSON_VALUE)
    public ApiData<BookWork> find(@PathVariable String workId,Authentication auth) {
        return new ApiData<>(catalog.find(UuidValue.parse(workId),ReaderIdentity.from(auth)));
    }

    @PostMapping(path="/api/v1/catalog/manual-works",consumes=MediaType.APPLICATION_JSON_VALUE,
                 produces=MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiData<BookWork>> manual(@RequestBody ManualWorkWrite write,
                                                     Authentication auth) {
        var work=catalog.createManual(ReaderIdentity.from(auth),write.title(),write.authors(),
            write.language());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiData<>(work));
    }
}
