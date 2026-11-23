package tn.ktob.catalog;

import java.net.URI;
import java.net.http.HttpClient;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import tn.ktob.api.shared.ApiException;
import tn.ktob.reader.ReaderService;

@Service
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public class CatalogService {
    private final JdbcTemplate db;
    private final ReaderService readers;
    private final OpenLibraryClient openLibrary;

    @Autowired
    public CatalogService(JdbcTemplate db,ReaderService readers,JsonMapper mapper,
                          @Value("${OPENLIBRARY_CONTACT:}") String contact) {
        this(db,readers,new OpenLibraryClient(URI.create("https://openlibrary.org"),
            contact,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build(),mapper));
    }

    /** Package-scoped adapter injection for database tests with a real local HTTP stub. */
    CatalogService(JdbcTemplate db,ReaderService readers,OpenLibraryClient openLibrary) {
        this.db=db;
        this.readers=readers;
        this.openLibrary=openLibrary;
    }

    private BookWork map(java.sql.ResultSet r,int ignored) throws java.sql.SQLException {
        String[] authors=(String[])r.getArray("authors").getArray();
        return new BookWork(r.getObject("id",UUID.class),r.getString("title"),
            List.of(authors),r.getString("origin"),r.getString("language"),
            r.getString("catalog_reference"),r.getString("metadata_status"),
            r.getObject("owner_reader_id",UUID.class));
    }

    public BookWork find(UUID id,UUID reader) {
        List<BookWork> hits=db.query("""
            SELECT * FROM app.catalog_works WHERE id=?
              AND (owner_reader_id IS NULL OR owner_reader_id=?)
            """,this::map,id,reader);
        if(hits.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND",
            "Book work not found.");
        return hits.getFirst();
    }

    @Transactional
    public BookWork createManual(UUID owner,String title,List<String> authors,String language) {
        if(title==null || title.isBlank() || title.length()>500 ||
            (authors!=null && (authors.size()>12 || authors.stream().anyMatch(
                a->a==null || a.isBlank() || a.length()>200)))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"VALIDATION_ERROR",
                "Invalid work title or author list.");
        }
        readers.findOrCreate(owner);
        UUID id=UUID.randomUUID();
        String[] people=authors==null?new String[0]:authors.toArray(String[]::new);
        db.update(con->{
            var ps=con.prepareStatement("""
                INSERT INTO app.catalog_works(id,title,authors,origin,owner_reader_id,
                    language,metadata_status) VALUES (?,?,?,'MANUAL',?,?,'UNKNOWN')
                """);
            ps.setObject(1,id);ps.setString(2,title.trim());
            ps.setArray(3,con.createArrayOf("text",people));
            ps.setObject(4,owner);ps.setString(5,language);
            return ps;
        });
        return find(id,owner);
    }

    public List<BookWork> search(UUID reader,String query,int limit) {
        String q=query==null?"":query.trim();
        if(q.length()>180) throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_QUERY",
            "Search text is too long.");
        readers.findOrCreate(reader);
        if(q.isBlank()) {
            // Browsing already known works is not an upstream relevance-ranked search.
            return db.query("""
                SELECT * FROM app.catalog_works WHERE owner_reader_id IS NULL OR owner_reader_id=?
                ORDER BY created_at DESC,id DESC LIMIT ?
                """,this::map,reader,limit);
        }

        // Keep the provider's ordered identity list. A later query by insertion time
        // reverses new provider results and makes repeat searches depend on cache age.
        List<OpenLibraryClient.FoundWork> items=openLibrary.search(q,limit);
        for(var item:items) {
            UUID id=UUID.randomUUID();
            db.update(con->{
                var ps=con.prepareStatement("""
                    INSERT INTO app.catalog_works(
                       id,title,authors,origin,language,catalog_reference,metadata_status)
                    VALUES (?,?,?,'OPEN_LIBRARY',?,?,'PARTIAL')
                    ON CONFLICT(catalog_reference) DO NOTHING
                    """);
                ps.setObject(1,id);ps.setString(2,item.title());
                ps.setArray(3,con.createArrayOf("text",item.authors().toArray(String[]::new)));
                ps.setString(4,item.language());ps.setString(5,item.reference());
                return ps;
            });
        }

        Map<String,BookWork> sourced=new HashMap<>();
        if(!items.isEmpty()) {
            var works=db.query(con->{
                var ps=con.prepareStatement("""
                    SELECT * FROM app.catalog_works
                    WHERE origin='OPEN_LIBRARY' AND catalog_reference=ANY(?)
                    """);
                ps.setArray(1,con.createArrayOf("text",items.stream()
                    .map(OpenLibraryClient.FoundWork::reference).toArray(String[]::new)));
                return ps;
            },this::map);
            for(var work:works)sourced.put(work.catalogReference(),work);
        }
        LinkedHashMap<UUID,BookWork> ordered=new LinkedHashMap<>();
        for(var item:items) {
            BookWork work=sourced.get(item.reference());
            if(work!=null)ordered.putIfAbsent(work.id(),work);
        }

        // Retain the existing private-manual title/author substring matching behavior.
        // These are reader-owned additions, never substitutes for provider records.
        String pattern="%"+q.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
        var manual=db.query("""
            SELECT * FROM app.catalog_works
            WHERE origin='MANUAL' AND owner_reader_id=?
              AND (title ILIKE ? ESCAPE '\\' OR array_to_string(authors,' ') ILIKE ? ESCAPE '\\')
            ORDER BY lower(title),id LIMIT ?
            """,this::map,reader,pattern,pattern,limit);
        for(var work:manual)ordered.putIfAbsent(work.id(),work);

        List<BookWork> ranked=new ArrayList<>(ordered.values());
        String normalizedQuery=normalizedTitle(q);
        if(!normalizedQuery.isEmpty()) {
            // List.sort is stable: exact titles move first; provider order within
            // both groups survives, including legitimate adaptations and editions.
            ranked.sort(Comparator.comparing(work->!normalizedTitle(work.title()).equals(normalizedQuery)));
        }
        return ranked.stream().limit(limit).toList();
    }

    private static String normalizedTitle(String value) {
        return Normalizer.normalize(value,Normalizer.Form.NFKD)
            .replaceAll("\\p{M}+","").toLowerCase(Locale.ROOT)
            .replaceAll("[\\p{P}\\p{Z}\\s]+"," ").trim();
    }
}
