package tn.ktob.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationBoundaryTest {
    @Autowired MockMvc mvc;

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void privateRoutesRejectAnonymousOrUnconfiguredJwt() throws Exception {
        mvc.perform(get("/api/v1/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer definitely-not-a-token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void blockedCrossOriginDoesNotReceiveCorsPermission() throws Exception {
        mvc.perform(get("/api/v1/health").header("Origin","https://evil.example"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
