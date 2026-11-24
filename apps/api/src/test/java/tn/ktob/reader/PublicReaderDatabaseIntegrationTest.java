package tn.ktob.reader;

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

/** Real HTTP+Postgres boundary. Private/source data must never leak via public projections. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true"})
@AutoConfigureMockMvc
class PublicReaderDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    final UUID owner=UUID.randomUUID(),stranger=UUID.randomUUID();
    final JsonMapper mapper=new JsonMapper();
    private org.springframework.test.web.servlet.request.RequestPostProcessor as(UUID who) {
        return jwt().jwt(j->j.subject(who.toString()).claim("role","authenticated")
            .audience(List.of("authenticated")));
    }
    private JsonNode call(MockHttpServletRequestBuilder req,UUID who,String body,int statusCode) throws Exception {
        if(who!=null)req.with(as(who));
        if(body!=null)req.contentType(MediaType.APPLICATION_JSON).content(body);
        var response=mvc.perform(req).andExpect(status().is(statusCode)).andReturn().getResponse();
        return response.getContentAsString().isBlank()?mapper.nullNode():mapper.readTree(response.getContentAsString());
    }
    private void discoverable() throws Exception {
        call(patch("/api/v1/me/public-profile"),owner,
            "{\"username\":\"reader_"+owner.toString().substring(0,8)+"\",\"discoverable\":true}",200);
    }
    private String username() {return "reader_"+owner.toString().substring(0,8);}
    private String sourcedBook() throws Exception {
        call(get("/api/v1/me"),owner,null,200);
        UUID work=UUID.randomUUID();
        db.update("""
            INSERT INTO app.catalog_works(id,title,authors,origin,language,catalog_reference,metadata_status)
            VALUES (?,'V4 Sourced Book',ARRAY['Book Author']::text[],'OPEN_LIBRARY','eng',?,'AVAILABLE')
            """,work,"/works/OL"+Math.abs(work.getMostSignificantBits())+"W");
        return call(post("/api/v1/library"),owner,"{\"workId\":\""+work+"\"}",201)
            .path("data").path("id").asText();
    }
    private String experience(String entry) throws Exception {
        return call(post("/api/v1/library/"+entry+"/experiences"),owner,
            "{\"status\":\"FINISHED\",\"historicalImport\":true,\"rating\":4.5}",201)
            .path("data").path("id").asText();
    }

    @Test void discoverabilityIsVoluntaryAndNeverExposesEmailOrHiddenProfiles() throws Exception {
        call(get("/api/v1/me/public-profile"),owner,null,200);
        assertFalse(call(get("/api/v1/me/public-profile"),owner,null,200).path("data").path("discoverable").asBoolean());
        assertTrue(call(get("/api/v1/readers/search").param("q","read"),stranger,null,200).path("data").isEmpty());
        call(get("/api/v1/readers/"+username()),stranger,null,404);
        discoverable();
        var list=call(get("/api/v1/readers/search").param("q",username().substring(0,5)),stranger,null,200).path("data");
        assertEquals(username(),list.get(0).path("username").asText());
        String publicJson=call(get("/api/v1/readers/"+username()),stranger,null,200).toString();
        assertFalse(publicJson.contains(owner.toString()));
        assertFalse(publicJson.toLowerCase().contains("email"));
        assertFalse(publicJson.contains("aiProcessingOptIn"));
        call(patch("/api/v1/me/public-profile"),owner,"{\"discoverable\":false}",200);
        call(get("/api/v1/readers/"+username()),stranger,null,404);
        assertTrue(call(get("/api/v1/readers/search").param("q",username().substring(0,5)),stranger,null,200).path("data").isEmpty());
        call(get("/api/v1/readers/search").param("q","re"),null,null,401);
        call(get("/api/v1/me/public-profile"),null,null,401);
    }

    @Test void ratingsArePublicOnlyWhenFlaggedAndNotesPublishIndividually() throws Exception {
        String entry=sourcedBook(),reading=experience(entry);
        assertTrue(call(get("/api/v1/experiences/"+reading),owner,null,200).path("data").path("ratingPublic").asBoolean());
        String privateNote=call(post("/api/v1/experiences/"+reading+"/journal"),owner,
            "{\"kind\":\"NOTE\",\"body\":\"PRIVATE_CANARY\",\"allowForPersonalization\":false}",201)
            .path("data").path("id").asText();
        String published=call(post("/api/v1/experiences/"+reading+"/journal"),owner,
            "{\"kind\":\"REVIEW\",\"body\":\"PUBLIC_REVIEW_CANARY\",\"allowForPersonalization\":false}",201)
            .path("data").path("id").asText();
        discoverable();
        var profile=call(get("/api/v1/readers/"+username()),stranger,null,200).path("data");
        assertEquals(1,profile.path("ratings").size());
        assertEquals(4.5,profile.path("ratings").get(0).path("rating").asDouble());
        assertTrue(profile.path("notes").isEmpty());
        call(patch("/api/v1/journal/"+published),owner,"{\"isPublic\":true}",200);
        profile=call(get("/api/v1/readers/"+username()),stranger,null,200).path("data");
        assertEquals(1,profile.path("notes").size());
        assertEquals("PUBLIC_REVIEW_CANARY",profile.path("notes").get(0).path("body").asText());
        assertFalse(profile.toString().contains("PRIVATE_CANARY"));
        call(patch("/api/v1/journal/"+privateNote),stranger,"{\"isPublic\":true}",404);
        call(patch("/api/v1/experiences/"+reading),owner,"{\"ratingPublic\":false}",200);
        profile=call(get("/api/v1/readers/"+username()),stranger,null,200).path("data");
        assertTrue(profile.path("ratings").isEmpty());
        call(patch("/api/v1/journal/"+published),owner,"{\"isPublic\":false}",200);
        assertTrue(call(get("/api/v1/readers/"+username()),stranger,null,200).path("data").path("notes").isEmpty());
    }

    @Test void privateManualWorksAreNeverPublishedAndNamesAreUnique() throws Exception {
        discoverable();
        var conflict=call(patch("/api/v1/me/public-profile"),stranger,
            "{\"username\":\""+username()+"\",\"discoverable\":true}",409);
        assertEquals("USERNAME_TAKEN",conflict.path("code").asText());
        call(patch("/api/v1/me/public-profile"),stranger,"{\"username\":\"admin\"}",422);
        call(patch("/api/v1/me/public-profile"),stranger,"{\"discoverable\":true}",422);
        String work=call(post("/api/v1/catalog/manual-works"),owner,
            "{\"title\":\"Secret Manual Work\",\"authors\":[\"Private\"]}",201).path("data").path("id").asText();
        String entry=call(post("/api/v1/library"),owner,"{\"workId\":\""+work+"\"}",201).path("data").path("id").asText();
        String reading=experience(entry);
        call(post("/api/v1/experiences/"+reading+"/journal"),owner,
            "{\"kind\":\"NOTE\",\"body\":\"MANUAL_PRIVATE_CANARY\",\"allowForPersonalization\":false,\"isPublic\":true}",422);
        assertTrue(call(get("/api/v1/readers/"+username()),stranger,null,200).path("data").path("ratings").isEmpty());
    }
}
