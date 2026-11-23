package tn.ktob.catalog;

import static org.junit.jupiter.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.json.JsonMapper;
import tn.ktob.api.shared.ApiException;

class OpenLibraryClientTest {

    @Test
    void usesHumanInitiatedSearchAndParsesOnlyRealWorkIdentifiers() throws Exception {
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        AtomicReference<String> agent=new AtomicReference<>();
        java.util.concurrent.atomic.AtomicInteger providerCalls=new java.util.concurrent.atomic.AtomicInteger();
        server.createContext("/search.json", ex->{
            agent.set(ex.getRequestHeaders().getFirst("User-Agent"));
            providerCalls.incrementAndGet();
            byte[] body=("""
                {"docs":[{"key":"/works/OL82563W","title":"A Book",
                           "author_name":["A. Writer"],"language":["eng"]},
                          {"key":"/books/OL1M","title":"Invalid Edition"}]}
                """).getBytes(java.nio.charset.StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type","application/json");
            ex.sendResponseHeaders(200,body.length);
            try(var out=ex.getResponseBody()){out.write(body);}
        });
        server.start();
        try {
            var client=new OpenLibraryClient(
                URI.create("http://127.0.0.1:"+server.getAddress().getPort()),
                "ktob-test@example.invalid",HttpClient.newHttpClient(),new JsonMapper());
            var works=client.search("a book",20);
            assertEquals(1,works.size());
            assertEquals("/works/OL82563W",works.getFirst().reference());
            assertEquals("A Book",works.getFirst().title());
            assertEquals("A. Writer",works.getFirst().authors().getFirst());
            assertTrue(agent.get().contains("ktob-test@example.invalid"));
            assertEquals(1,client.search("a book",20).size());
            assertEquals(1,providerCalls.get(),"Repeated query must use short-lived cache");
        }finally { server.stop(0); }
    }

    @Test
    void retriesTransientUpstreamFailureAndRequestsOnlyNeededFields() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        AtomicReference<String> requestQuery = new AtomicReference<>();
        server.createContext("/search.json", ex -> {
            requestQuery.set(ex.getRequestURI().getRawQuery());
            int attempt = calls.incrementAndGet();
            byte[] body = (attempt == 1
                ? "{\"message\":\"temporarily unavailable\"}"
                : "{\"docs\":[{\"key\":\"OL82563W\",\"title\":\"The Little Prince\","
                    + "\"author_name\":[\"Antoine de Saint-Exupéry\"],\"language\":[\"eng\"]}]}").getBytes(
                        java.nio.charset.StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(attempt == 1 ? 503 : 200, body.length);
            try (var out = ex.getResponseBody()) { out.write(body); }
        });
        server.start();
        try {
            var client = new OpenLibraryClient(
                URI.create("http://127.0.0.1:" + server.getAddress().getPort()),
                "ktob-test@example.invalid", HttpClient.newHttpClient(), new JsonMapper());
            var results = client.search("The Little Prince", 10);
            assertEquals(2, calls.get(), "Transient 503 should be retried once");
            assertEquals(1, results.size());
            assertEquals("The Little Prince", results.getFirst().title());
            assertEquals("/works/OL82563W", results.getFirst().reference());
            assertTrue(requestQuery.get().contains("fields=key%2Ctitle%2Cauthor_name%2Clanguage"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void doesNotRetryNonTransientClientErrors() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        server.createContext("/search.json", ex -> {
            calls.incrementAndGet();
            byte[] body = "{}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
            ex.sendResponseHeaders(403, body.length);
            try (var out = ex.getResponseBody()) { out.write(body); }
        });
        server.start();
        try {
            var client = new OpenLibraryClient(
                URI.create("http://127.0.0.1:" + server.getAddress().getPort()),
                "ktob-test@example.invalid", HttpClient.newHttpClient(), new JsonMapper());
            ApiException error = assertThrows(ApiException.class,
                () -> client.search("The Little Prince", 10));
            assertEquals("CATALOG_UNAVAILABLE", error.code());
            assertEquals(1, calls.get(), "Non-transient 403 should not be retried");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void unavailableWithoutIdentificationDoesNotContactProvider() {
        var client=new OpenLibraryClient(URI.create("https://openlibrary.org"),"",
            HttpClient.newHttpClient(),new JsonMapper());
        ApiException failure=assertThrows(ApiException.class,()->client.search("hello",10));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,failure.status());
        assertEquals("CATALOG_UNAVAILABLE",failure.code());
    }
}
