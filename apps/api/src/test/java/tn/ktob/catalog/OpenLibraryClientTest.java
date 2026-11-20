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
    void unavailableWithoutIdentificationDoesNotContactProvider() {
        var client=new OpenLibraryClient(URI.create("https://openlibrary.org"),"",
            HttpClient.newHttpClient(),new JsonMapper());
        ApiException failure=assertThrows(ApiException.class,()->client.search("hello",10));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,failure.status());
        assertEquals("CATALOG_UNAVAILABLE",failure.code());
    }
}
