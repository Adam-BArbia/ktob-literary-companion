package tn.ktob.catalog;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Disposable PostgreSQL tests: the API must never disclose hidden reader content. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true"})
@AutoConfigureMockMvc
class BookCommunityDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    private final JsonMapper json = new JsonMapper();
    private final UUID reader = UUID.randomUUID();
    private final UUID visitor = UUID.randomUUID();

    private JsonNode send(MockHttpServletRequestBuilder request, UUID user, String payload, int code)
            throws Exception {
        if(user!=null)request.with(jwt().jwt(j->j.subject(user.toString())
            .audience(List.of("authenticated")).claim("role","authenticated")));
        if(payload!=null)request.contentType(MediaType.APPLICATION_JSON).content(payload);
        var response=mvc.perform(request).andExpect(status().is(code)).andReturn().getResponse();
        return response.getContentAsString().isBlank()?json.nullNode():
            json.readTree(response.getContentAsString());
    }
    private UUID work() throws Exception {
        send(get("/api/v1/me"),reader,null,200);
        UUID id=UUID.randomUUID();
        db.update("""
            INSERT INTO app.catalog_works
              (id,title,authors,origin,language,catalog_reference,metadata_status)
            VALUES (?,'V5 Public Work',ARRAY['Test Author']::text[],'OPEN_LIBRARY','eng',?,'AVAILABLE')
            """,id,"/works/OL"+Long.toUnsignedString(id.getMostSignificantBits())+"W");
        return id;
    }
    private String entry(UUID workId) throws Exception {
        return send(post("/api/v1/library"),reader,
            "{\"workId\":\""+workId+"\"}",201).path("data").path("id").asText();
    }
    private String reading(String libraryEntry,String rating) throws Exception {
        return send(post("/api/v1/library/"+libraryEntry+"/experiences"),reader,
            "{\"status\":\"FINISHED\",\"historicalImport\":true,\"rating\":"+rating+"}",201)
                .path("data").path("id").asText();
    }
    private JsonNode community(UUID id) throws Exception {
        return send(get("/api/v1/catalog/works/"+id+"/community"),visitor,null,200).path("data");
    }
    private void publishProfile() throws Exception {
        send(patch("/api/v1/me/public-profile"),reader,
            "{\"username\":\"reader_"+reader.toString().substring(0,8)+"\",\"discoverable\":true}",200);
    }

    @Test void privateByDefaultAndPerNotePublishingRequireDiscoverableProfile() throws Exception {
        UUID id=work();
        String lib=entry(id),session=reading(lib,"4.5");
        String privateNote=send(post("/api/v1/experiences/"+session+"/journal"),reader,
            "{\"kind\":\"NOTE\",\"body\":\"SECRET_CANARY\",\"allowForPersonalization\":false}",201)
            .path("data").path("id").asText();
        String publicNote=send(post("/api/v1/experiences/"+session+"/journal"),reader,
            "{\"kind\":\"REVIEW\",\"body\":\"SHARED_CANARY\",\"allowForPersonalization\":false,\"isPublic\":true}",201)
            .path("data").path("id").asText();
        var hidden=community(id);
        assertEquals(0,hidden.path("ratingCount").asInt());
        assertTrue(hidden.path("notes").isEmpty());
        publishProfile();
        var shared=community(id);
        assertEquals(1,shared.path("ratingCount").asInt());
        assertEquals(4.5,shared.path("averageRating").asDouble());
        assertEquals(1,shared.path("notes").size());
        assertEquals("SHARED_CANARY",shared.path("notes").get(0).path("body").asText());
        assertFalse(shared.toString().contains("SECRET_CANARY"));
        assertFalse(shared.toString().contains(reader.toString()));
        send(patch("/api/v1/journal/"+privateNote),reader,"{\"isPublic\":true}",200);
        assertEquals(2,community(id).path("notes").size());
        send(patch("/api/v1/journal/"+publicNote),reader,"{\"isPublic\":false}",200);
        assertEquals(1,community(id).path("notes").size());
        send(patch("/api/v1/me/public-profile"),reader,"{\"discoverable\":false}",200);
        assertTrue(community(id).path("notes").isEmpty());
        assertEquals(0,community(id).path("ratingCount").asInt());
    }

    @Test void latestReaderRatingIsCountedOnlyOnceAndRevocationRemovesIt() throws Exception {
        UUID id=work();
        String lib=entry(id);
        String first=reading(lib,"2.5");
        publishProfile();
        assertEquals(2.5,community(id).path("averageRating").asDouble());
        String second=reading(lib,"4.5");
        var preview=community(id);
        assertEquals(1,preview.path("ratingCount").asInt());
        assertEquals(4.5,preview.path("averageRating").asDouble());
        send(patch("/api/v1/experiences/"+second),reader,"{\"ratingPublic\":false}",200);
        assertEquals(0,community(id).path("ratingCount").asInt());
        assertTrue(community(id).path("averageRating").isNull());
        // An older public rating must not resurface once the newer rating is private.
        send(patch("/api/v1/experiences/"+first),reader,"{\"ratingPublic\":true}",200);
        assertEquals(0,community(id).path("ratingCount").asInt());
        send(delete("/api/v1/library/"+lib),reader,null,204);
        assertTrue(community(id).path("notes").isEmpty());
    }

    @Test void rejectsManualWorksAndAnonymousVisitors() throws Exception {
        UUID sourced=work();
        send(get("/api/v1/catalog/works/"+sourced+"/community"),null,null,401);
        UUID privateId=UUID.randomUUID();
        db.update("""
            INSERT INTO app.catalog_works
              (id,title,authors,origin,owner_reader_id,metadata_status)
            VALUES (?,'Never Public',ARRAY['Private']::text[],'MANUAL',?,'UNKNOWN')
            """,privateId,reader);
        send(get("/api/v1/catalog/works/"+privateId+"/community"),visitor,null,404);
        send(get("/api/v1/catalog/works/"+UUID.randomUUID()+"/community"),visitor,null,404);
    }
}
