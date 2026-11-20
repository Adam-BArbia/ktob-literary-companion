package tn.ktob.security;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tools.jackson.databind.json.JsonMapper;

/**
 * Only verified Supabase JWTs reach private endpoints. When no KTOB Supabase
 * issuer/JWKS is configured, private requests fail closed (401) by design.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, JsonMapper mapper) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable) // bearer token, never a session cookie
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(
                org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())
                .authenticationEntryPoint((req, res, ex) ->
                    writeProblem(res, mapper, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED"))
                .accessDeniedHandler((req, res, ex) ->
                    writeProblem(res, mapper, HttpStatus.FORBIDDEN, "FORBIDDEN")))
            .build();
    }

    private static void writeProblem(HttpServletResponse res, JsonMapper mapper,
                                     HttpStatus status, String code) throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        // Explicit fields avoid leaking internal Spring Security exception details.
        var body = java.util.Map.of(
            "type", "about:blank", "title", status.getReasonPhrase(),
            "status", status.value(), "detail", status.getReasonPhrase(),
            "code", code, "traceId", UUID.randomUUID().toString());
        res.getWriter().write(mapper.writeValueAsString(body));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${ALLOWED_WEB_ORIGINS:http://localhost:4200}") String origins) {
        CorsConfiguration conf = new CorsConfiguration();
        List<String> trusted = Arrays.stream(origins.split(","))
            .map(String::trim).filter(x -> !x.isBlank()).toList();
        if (trusted.isEmpty() || trusted.stream().anyMatch(x -> x.contains("*"))) {
            throw new IllegalStateException("Explicit CORS origins required");
        }
        conf.setAllowedOrigins(trusted);
        conf.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        conf.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        conf.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/v1/**", conf);
        return source;
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${SUPABASE_ISSUER:}") String issuer,
                          @Value("${SUPABASE_JWKS_URL:}") String jwksUrl) {
        if (issuer.isBlank() || jwksUrl.isBlank()) {
            return token -> { throw new BadJwtException("KTOB authentication not configured"); };
        }
        if (!issuer.startsWith("https://") ||
            !jwksUrl.equals(issuer.replaceAll("/+$", "") + "/.well-known/jwks.json")) {
            throw new IllegalStateException("Supabase JWKS URL must match HTTPS issuer");
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUrl)
            .jwsAlgorithm(SignatureAlgorithm.RS256)
            .jwsAlgorithm(SignatureAlgorithm.ES256)
            .build();
        OAuth2TokenValidator<Jwt> tenantValidator = jwt -> {
            boolean valid = jwt.getAudience() != null && jwt.getAudience().contains("authenticated")
                && "authenticated".equals(jwt.getClaimAsString("role"));
            try { UUID.fromString(jwt.getSubject()); }
            catch (RuntimeException e) { valid = false; }
            return valid ? OAuth2TokenValidatorResult.success() :
                OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Invalid Supabase user token", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuer), tenantValidator));
        return decoder;
    }
}
