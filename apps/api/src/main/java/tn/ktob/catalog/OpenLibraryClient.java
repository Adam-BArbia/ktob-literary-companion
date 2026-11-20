package tn.ktob.catalog;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import tn.ktob.api.shared.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Calls Open Library metadata only. No scraped storefront, invented offers, or AI. */
public final class OpenLibraryClient {
    private final URI base;
    private final String contact;
    private final HttpClient http;
    private final JsonMapper json;

    public record FoundWork(String reference, String title, List<String> authors, String language) {}

    /** Production uses only the official origin; the test constructor can inject a local stub. */
    public OpenLibraryClient(URI base, String contact, HttpClient http, JsonMapper json) {
        this.base=base; this.contact=contact; this.http=http; this.json=json;
    }

    public List<FoundWork> search(String query, int limit) {
        if (contact == null || contact.isBlank()) {
            throw unavailable();
        }
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
        URI url=base.resolve("/search.json?q="+encoded+"&limit="+Math.min(limit,25));
        try {
            HttpRequest request=HttpRequest.newBuilder(url)
                .timeout(Duration.ofSeconds(6))
                .header("User-Agent","KTOB (contact: "+contact+")")
                .header("Accept","application/json")
                .GET().build();
            HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200) throw unavailable();
            JsonNode rows=json.readTree(response.body()).path("docs");
            if(!rows.isArray()) throw unavailable();
            List<FoundWork> result=new ArrayList<>();
            for(JsonNode d:rows){
                String key=d.path("key").asText("");
                String title=d.path("title").asText("").trim();
                if(!key.matches("/works/OL[0-9]+W") || title.isBlank()) continue;
                List<String> authors=new ArrayList<>();
                JsonNode arr=d.path("author_name");
                if(arr.isArray()) for(JsonNode a:arr) {
                    String text=a.asText("").trim();
                    if(!text.isEmpty() && authors.size()<12) authors.add(text);
                }
                String language=null;
                JsonNode languages=d.path("language");
                if(languages.isArray() && languages.size()>0) {
                    language=languages.get(0).asText(null);
                }
                result.add(new FoundWork(key,title,List.copyOf(authors),language));
            }
            return List.copyOf(result);
        } catch (ApiException e) { throw e; }
        catch (Exception e) { throw unavailable(); }
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"CATALOG_UNAVAILABLE",
            "External book lookup is unavailable. You may create a private manual work.");
    }
}
