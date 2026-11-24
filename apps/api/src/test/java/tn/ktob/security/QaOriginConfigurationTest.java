package tn.ktob.security;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class QaOriginConfigurationTest {
    @Test void optionalPreviewDoesNotReplaceProductionOriginsOrAllowOtherPreviews() {
        var source=new SecurityConfiguration().corsConfigurationSource(
            "https://ktob-web-front.vercel.app,http://localhost:4200","https://ktob-preview-123.vercel.app");
        var config=source.getCorsConfiguration(new MockHttpServletRequest("POST","/api/v1/conversations"));
        assertNotNull(config);
        assertEquals(List.of("https://ktob-web-front.vercel.app","http://localhost:4200",
            "https://ktob-preview-123.vercel.app"),config.getAllowedOrigins());
        assertNull(config.checkOrigin("https://unconfigured.vercel.app"));
        assertFalse(Boolean.TRUE.equals(config.getAllowCredentials()));
    }
    @Test void invalidPreviewValuesFailClosed() {
        for(String value:List.of("https://*.vercel.app","https://a.vercel.app,https://b.vercel.app",
            "http://ktob.vercel.app","https://ktob.vercel.app/","https://ktob.vercel.app/path",
            "https://ktob.vercel.app:443","https://user@ktob.vercel.app","https://ktob.vercel.app?x=1",
            "https://ktob.vercel.app#fragment","https://vercel.app","https://ktob.vercel.app.evil.invalid",
            "https://-bad.vercel.app","https://bad-.vercel.app")) {
            assertThrows(IllegalStateException.class,()->new SecurityConfiguration()
                .corsConfigurationSource("https://ktob-web-front.vercel.app",value));
        }
    }
}
