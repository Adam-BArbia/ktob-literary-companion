package tn.ktob.api.shared;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** The test-only routes below never enter src/main or the published 57 operations. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(ApiExceptionHandlerTest.ProbeController.class)
class ApiExceptionHandlerTest {

    @Autowired
    MockMvc mvc;

    @RestController
    static class ProbeController {

        @GetMapping("/__test/uuid/{id}")
        String uuid(@PathVariable UUID id) {
            return id.toString();
        }

        @PostMapping("/__test/validate")
        ApiData<String> validate(@Valid @RequestBody ProbeBody body) {
            return new ApiData<>(body.name());
        }

        @GetMapping("/__test/page")
        ApiPage<String> page() {
            return new ApiPage<>(List.of("one"), new PageMeta(null));
        }

        @GetMapping("/__test/conflict")
        String conflict() {
            throw new ApiException(HttpStatus.CONFLICT, "LIBRARY_ENTRY_ARCHIVED", "Library entry archived.");
        }

        @GetMapping("/__test/internal")
        String internal() {
            throw new IllegalStateException("PRIVATE_DATABASE_PASSWORD=must-never-leak");
        }
    }

    record ProbeBody(@NotBlank String name) {}

    @Test
    void domainConflictUsesRfc9457EnvelopeAndStableCode() throws Exception {
        mvc.perform(get("/__test/conflict"))
            .andExpect(status().isConflict())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.type").value("about:blank"))
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.code").value("LIBRARY_ENTRY_ARCHIVED"))
            .andExpect(jsonPath("$.traceId").isString());
    }

    @Test
    void invalidUuidGetsSafe400Problem() throws Exception {
        mvc.perform(get("/__test/uuid/not-a-uuid"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
            .andExpect(jsonPath("$.traceId").isString());
    }

    @Test
    void invalidJsonAndFieldsGetDistinctSafeCodes() throws Exception {
        mvc.perform(post("/__test/validate").contentType(MediaType.APPLICATION_JSON).content("{"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_JSON"));
        mvc.perform(post("/__test/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void serializesDataAndPageEnvelopes() throws Exception {
        mvc.perform(post("/__test/validate").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"KTOB\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").value("KTOB"));
        mvc.perform(get("/__test/page"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0]").value("one"))
            .andExpect(jsonPath("$.meta.nextCursor").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void serverErrorsDoNotLeakPrivateErrorMessages() throws Exception {
        mvc.perform(get("/__test/internal"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
            .andExpect(jsonPath("$.detail").value("The server could not process this request."))
            .andExpect(jsonPath("$.traceId").isString());
    }
}
