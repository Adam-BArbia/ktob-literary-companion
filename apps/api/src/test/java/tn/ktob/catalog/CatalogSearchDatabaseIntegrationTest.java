package tn.ktob.catalog;

import static org.junit.jupiter.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import tn.ktob.reader.ReaderService;
import tools.jackson.databind.json.JsonMapper;

/** Provider order and canonical persistence verified through real HTTP and PostgreSQL. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true"})
class CatalogSearchDatabaseIntegrationTest {
    @Autowired JdbcTemplate db;
    @Autowired ReaderService readers;
    @Autowired CatalogService catalog;

    private record Source(String key,String title) {
        Source(String title){this("/works/OL"+Long.toUnsignedString(UUID.randomUUID().getMostSignificantBits())+"W",title);}
    }

    private static final class Stub implements AutoCloseable {
        final AtomicInteger calls=new AtomicInteger();
        final HttpServer server;
        final OpenLibraryClient client;
        Stub(List<Source> books)throws Exception{
            server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            byte[] body=new JsonMapper().writeValueAsString(Map.of("docs",books.stream().map(book->
                Map.of("key",book.key(),"title",book.title(),"author_name",List.of("Source Author")))
                .toList())).getBytes(StandardCharsets.UTF_8);
            server.createContext("/search.json",exchange->{
                calls.incrementAndGet();exchange.getResponseHeaders().add("Content-Type","application/json");
                exchange.sendResponseHeaders(200,body.length);
                try(var output=exchange.getResponseBody()){output.write(body);}
            });
            server.start();
            client=new OpenLibraryClient(URI.create("http://127.0.0.1:"+server.getAddress().getPort()),
                "ktob-test@example.invalid",HttpClient.newHttpClient(),new JsonMapper());
        }
        public void close(){server.stop(0);}
    }

    @Test void preservesProviderMatchesAndOrderRegardlessOfDatabaseInsertionTimes()throws Exception{
        UUID reader=UUID.randomUUID();
        var sources=List.of(new Source("Blue Sky"),new Source("Red Sand"),new Source("Green Lake"));
        try(var stub=new Stub(sources)){
            CatalogService search=new CatalogService(db,readers,stub.client);
            // A provider can legitimately match subjects or alternate titles, not only the displayed title.
            var first=search.search(reader,"narrative",10);
            assertEquals(sources.stream().map(Source::key).toList(),first.stream().map(BookWork::catalogReference).toList());
            assertTrue(first.stream().allMatch(book->book.origin().equals("OPEN_LIBRARY") && book.ownerReaderId()==null));
            db.update("UPDATE app.catalog_works SET created_at='2040-01-01T00:00:00Z' WHERE id=?",first.get(2).id());
            db.update("UPDATE app.catalog_works SET created_at='2000-01-01T00:00:00Z' WHERE id=?",first.get(0).id());
            var cached=search.search(reader,"narrative",10);
            assertEquals(first.stream().map(BookWork::id).toList(),cached.stream().map(BookWork::id).toList());
            assertEquals(1,stub.calls.get(),"Repeated searches use the existing short-lived provider cache");
        }
    }

    @Test void promotesNormalizedExactTitlesStablyWithoutRemovingAdaptations()throws Exception{
        UUID reader=UUID.randomUUID();
        var illustrated=new Source("Café Moon: illustrated");
        var exactFirst=new Source("CAFÉ—MOON!");
        var exactSecond=new Source("Cafe Moon");
        var manga=new Source("Cafe Moon manga");
        var manual=catalog.createManual(reader,"Cafe Moon",List.of("My Author"),null);
        try(var stub=new Stub(List.of(illustrated,exactFirst,exactSecond,manga))){
            CatalogService search=new CatalogService(db,readers,stub.client);
            var result=search.search(reader,"cafe moon",10);
            assertEquals(5,result.size());
            assertEquals(exactFirst.key(),result.get(0).catalogReference());
            assertEquals(exactSecond.key(),result.get(1).catalogReference());
            assertEquals(manual.id(),result.get(2).id());
            assertEquals("MANUAL",result.get(2).origin());
            assertEquals(illustrated.key(),result.get(3).catalogReference());
            assertEquals(manga.key(),result.get(4).catalogReference());
            var again=search.search(reader,"CAFE MOON",10);
            assertEquals(result.stream().map(BookWork::id).toList(),again.stream().map(BookWork::id).toList());
            assertEquals(1,stub.calls.get());
        }
    }

    @Test void manualMatchesRemainPrivateAndSearchableByTitleOrAuthor()throws Exception{
        UUID reader=UUID.randomUUID(),other=UUID.randomUUID();
        var authorMatch=catalog.createManual(reader,"A Quiet Harbour",List.of("Narrative Writer"),null);
        var titleMatch=catalog.createManual(reader,"Notes on narrative",List.of("Another Writer"),null);
        var hidden=catalog.createManual(other,"Narrative secrets",List.of("Narrative Writer"),null);
        try(var stub=new Stub(List.of())){
            CatalogService search=new CatalogService(db,readers,stub.client);
            assertEquals(List.of(authorMatch.id(),titleMatch.id()),
                search.search(reader,"narrative",10).stream().map(BookWork::id).toList());
            var browsing=search.search(reader,"",100);
            assertTrue(browsing.stream().anyMatch(book->book.id().equals(authorMatch.id())));
            assertTrue(browsing.stream().noneMatch(book->book.id().equals(hidden.id())));
            assertEquals(1,stub.calls.get(),"Blank browsing must not trigger an external search");
        }
    }
}
