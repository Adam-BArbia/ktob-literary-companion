package tn.ktob.catalog;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import tn.ktob.api.shared.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Calls Open Library metadata only. No scraped storefront, invented offers, or AI. */
public final class OpenLibraryClient {
    private static final Logger LOG = LoggerFactory.getLogger(OpenLibraryClient.class);
    private final URI base;
    private final String contact;
    private final HttpClient http;
    private final JsonMapper json;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();
    private long lastRequestAtMillis = 0;
    private record Cached(List<FoundWork> books, long expiresAt) {}

    public record FoundWork(String reference, String title, List<String> authors, String language) {}

    /** Production uses only the official origin; the test constructor can inject a local stub. */
    public OpenLibraryClient(URI base, String contact, HttpClient http, JsonMapper json) {
        this.base=base; this.contact=contact; this.http=http; this.json=json;
    }

    public List<FoundWork> search(String query, int limit) {
        if (contact == null || contact.isBlank()) {
            throw unavailable();
        }
        String cacheKey = query.toLowerCase(Locale.ROOT) + ":" + Math.min(limit,25);
        long now = System.currentTimeMillis();
        Cached hit = cache.get(cacheKey);
        if (hit != null && hit.expiresAt() > now) return hit.books();
        synchronized (this) {
            now = System.currentTimeMillis();
            hit = cache.get(cacheKey);
            if (hit != null && hit.expiresAt() > now) return hit.books();
            long remaining = 1000 - (now - lastRequestAtMillis);
            if (remaining > 0) {
                try { Thread.sleep(remaining); }
                catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw unavailable();
                }
            }
            lastRequestAtMillis = System.currentTimeMillis();
            List<FoundWork> books = fetch(query, limit);
            if (cache.size() > 100) cache.clear();
            cache.put(cacheKey, new Cached(books, System.currentTimeMillis() + 600_000));
            return books;
        }
    }

    private List<FoundWork> fetch(String query, int limit) {
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
        // A small, explicit field set avoids slow, oversized Open Library responses.
        URI url = base.resolve("/search.json?q=" + encoded
            + "&fields=key%2Ctitle%2Cauthor_name%2Clanguage&limit=" + Math.min(limit, 25));
        HttpRequest request = HttpRequest.newBuilder(url)
            .timeout(Duration.ofSeconds(15))
            .header("User-Agent", "KTOB (contact: " + contact + ")")
            .header("Accept", "application/json")
            .GET().build();

        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                HttpResponse<String> response =
                    http.send(request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();
                if (status != 200) {
                    // No query, contact information, response body or token is logged.
                    LOG.warn("Open Library search returned HTTP {}", status);
                    if (attempt == 0 && (status == 429 || status >= 500 && status < 600)) {
                        retryDelay();
                        continue;
                    }
                    throw unavailable();
                }
                JsonNode rows = json.readTree(response.body()).path("docs");
                if (!rows.isArray()) {
                    LOG.warn("Open Library search response lacked a docs array");
                    throw unavailable();
                }
                List<FoundWork> result = new ArrayList<>();
                var seen = new HashSet<String>();
                for (JsonNode d : rows) {
                    String key = d.path("key").asText("");
                    String title = d.path("title").asText("").trim();
                    // Open Library documents both bare OL work IDs and /works/ paths.
                    if (key.matches("OL[0-9]+W")) key = "/works/" + key;
                    if (!key.matches("/works/OL[0-9]+W") || title.isBlank() || !seen.add(key)) continue;
                    List<String> authors = new ArrayList<>();
                    JsonNode authorsNode = d.path("author_name");
                    if (authorsNode.isArray()) for (JsonNode author : authorsNode) {
                        String name = author.asText("").trim();
                        if (!name.isEmpty() && authors.size() < 12) authors.add(name);
                    }
                    String language = null;
                    JsonNode languages = d.path("language");
                    if (languages.isArray() && languages.size() > 0) {
                        language = languages.get(0).asText(null);
                    }
                    result.add(new FoundWork(key, title, List.copyOf(authors), language));
                    if (result.size() >= Math.min(limit, 25)) break;
                }
                return List.copyOf(result);
            } catch (ApiException e) {
                throw e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                LOG.warn("Open Library lookup interrupted");
                throw unavailable();
            } catch (Exception e) {
                LOG.warn("Open Library lookup transport or decoding failure: {}",
                    e.getClass().getSimpleName());
                if (attempt == 0) {
                    retryDelay();
                    continue;
                }
                throw unavailable();
            }
        }
        throw unavailable();
    }

    /** Back off before one retry, respecting Open Library's request rate limits. */
    private static void retryDelay() {
        try {
            Thread.sleep(1200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
    }

    private static ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"CATALOG_UNAVAILABLE",
            "External book lookup is unavailable. You may create a private manual work.");
    }
}
