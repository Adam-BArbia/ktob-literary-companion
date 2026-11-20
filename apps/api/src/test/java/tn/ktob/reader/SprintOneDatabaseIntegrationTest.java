package tn.ktob.reader;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Runs only in ephemeral CI PostgreSQL; never points at a shared Supabase project. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true"})
@AutoConfigureMockMvc
class SprintOneDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    private final UUID owner=UUID.randomUUID();
    private final UUID stranger=UUID.randomUUID();

    private org.springframework.test.web.servlet.request.RequestPostProcessor as(UUID who) {
        return jwt().jwt(j->j.subject(who.toString()).claim("role","authenticated")
            .audience(java.util.List.of("authenticated")));
    }

    @Test
    void profilesArePrivateAndAiConsentDefaultsOff() throws Exception {
        mvc.perform(get("/api/v1/me").with(as(owner)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.displayName").value("Reader"))
            .andExpect(jsonPath("$.data.id").value(owner.toString()));
        mvc.perform(patch("/api/v1/me").with(as(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"displayName\":\"Reader A\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.displayName").value("Reader A"));
        mvc.perform(get("/api/v1/me").with(as(stranger)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.displayName").value("Reader"));
        Boolean consent=db.queryForObject(
            "SELECT ai_processing_opt_in FROM app.privacy_settings WHERE reader_id=?",
            Boolean.class,owner);
        org.junit.jupiter.api.Assertions.assertFalse(consent);
    }

    @Test
    void manualWorkAndLibraryAreIsolatedAndArchiveCanRestore() throws Exception {
        String created=mvc.perform(post("/api/v1/catalog/manual-works").with(as(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Private Literature\",\"authors\":[\"Test Author\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.origin").value("MANUAL"))
            .andReturn().getResponse().getContentAsString();
        String workId=new tools.jackson.databind.json.JsonMapper()
            .readTree(created).path("data").path("id").asText();

        mvc.perform(get("/api/v1/catalog/works/"+workId).with(as(stranger)))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/library").with(as(stranger))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"workId\":\""+workId+"\"}"))
            .andExpect(status().isNotFound());

        String body="{\"workId\":\""+workId+"\"}";
        String added=mvc.perform(post("/api/v1/library").with(as(owner))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.shelfStatus").value("WANT_TO_READ"))
            .andReturn().getResponse().getContentAsString();
        String entryId=new tools.jackson.databind.json.JsonMapper()
            .readTree(added).path("data").path("id").asText();

        mvc.perform(post("/api/v1/library").with(as(owner))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("LIBRARY_DUPLICATE"));
        mvc.perform(get("/api/v1/library/"+entryId).with(as(stranger)))
            .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/library/"+entryId).with(as(owner)))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/library").with(as(owner)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(0));
        mvc.perform(get("/api/v1/library/"+entryId).with(as(owner)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.archivedAt").isNotEmpty());
        mvc.perform(post("/api/v1/library/"+entryId+"/restore").with(as(owner)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.archivedAt").value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(get("/api/v1/library").with(as(owner)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].id").value(entryId));
    }
}
