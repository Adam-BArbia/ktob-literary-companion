package tn.ktob.advisor;

import static org.junit.jupiter.api.Assertions.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import tn.ktob.api.shared.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(OutputCaptureExtension.class)
class GroqLiteraryAiAdapterTest {
    private final JsonMapper json=new JsonMapper();
    private static final String ANSWER="A symbol connects a concrete image with a broader idea.";
    private static final List<LiteraryAiPort.PromptMessage> PROMPT=List.of(new LiteraryAiPort.PromptMessage("user","NON_SENSITIVE_TEST_PROMPT"));
    private String success(String answer,String finish) {
        return json.writeValueAsString(Map.of("model",GroqLiteraryAiAdapter.MODEL,
            "choices",List.of(Map.of("message",Map.of("role","assistant","content",answer),"finish_reason",finish))));
    }
    private GroqLiteraryAiAdapter adapter(URI uri,Duration timeout) {
        return new GroqLiteraryAiAdapter(uri,"synthetic-test-credential",true,
            HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build(),json,timeout,0);
    }
    @Test void sendsBoundedStatelessRequestAndReturnsOnlyActualFinalContent(CapturedOutput logs)throws Exception {
        AtomicReference<JsonNode> received=new AtomicReference<>();
        try(Stub server=new Stub(200,success(ANSWER,"stop"),0,Map.of(
            "x-ratelimit-limit-requests","1000","x-ratelimit-limit-tokens","8000"))) {
            server.received=received;
            assertEquals(ANSWER,adapter(server.uri(),Duration.ofSeconds(2)).complete(PROMPT));
            JsonNode request=received.get();
            assertEquals(GroqLiteraryAiAdapter.MODEL,request.path("model").asText());
            assertEquals(1024,request.path("max_completion_tokens").asInt());
            assertEquals("low",request.path("reasoning_effort").asText());
            assertFalse(request.path("include_reasoning").asBoolean());
            assertFalse(request.path("stream").asBoolean());
            assertFalse(request.has("tools"));assertFalse(request.has("store"));
            assertEquals(1,server.calls.get());
            assertFalse(logs.toString().contains(ANSWER));
            assertFalse(logs.toString().contains("NON_SENSITIVE_TEST_PROMPT"));
            assertFalse(logs.toString().contains("synthetic-test-credential"));
            assertTrue(logs.toString().contains("requestLimit=1000, tokenLimit=8000"));
        }
    }
    @Test void missingKeyOrQualificationNeverCallsRemoteEndpoint()throws Exception {
        try(Stub server=new Stub(200,success(ANSWER,"stop"),0,Map.of())) {
            for(var flags:List.of(new Object[]{"",true},new Object[]{"test",false})) {
                var adapter=new GroqLiteraryAiAdapter(server.uri(),(String)flags[0],(Boolean)flags[1],
                    HttpClient.newHttpClient(),json,Duration.ofSeconds(1),0);
                assertFalse(adapter.available());assertEquals(503,assertThrows(ApiException.class,
                    ()->adapter.complete(PROMPT)).status().value());
            }
            assertEquals(0,server.calls.get());
        }
    }
    @Test void quotaHonorsRetryAfterAndDoesNotRetryOrLogProviderBody(CapturedOutput logs)throws Exception {
        try(Stub server=new Stub(429,"PRIVATE_PROVIDER_ERROR_CANARY",0,Map.of("Retry-After","7"))) {
            var adapter=adapter(server.uri(),Duration.ofSeconds(2));
            var error=assertThrows(ApiException.class,()->adapter.complete(PROMPT));
            assertEquals(429,error.status().value());assertEquals(7,error.retryAfterSeconds());
            assertEquals(429,assertThrows(ApiException.class,()->adapter.complete(PROMPT)).status().value());
            assertEquals(1,server.calls.get());
            assertFalse(logs.toString().contains("PRIVATE_PROVIDER_ERROR_CANARY"));
        }
    }
    @Test void retryAfterAcceptsDateAndDailyCooldownAndInvalidKeyFailsSanitized()throws Exception {
        String date=ZonedDateTime.now(ZoneOffset.UTC).plusMinutes(2).format(DateTimeFormatter.RFC_1123_DATE_TIME);
        try(Stub server=new Stub(429,"temporary quota",0,Map.of("Retry-After",date))) {
            var error=assertThrows(ApiException.class,()->adapter(server.uri(),Duration.ofSeconds(2)).complete(PROMPT));
            assertTrue(error.retryAfterSeconds()>=118 && error.retryAfterSeconds()<=121);
        }
        try(Stub server=new Stub(429,"daily quota",0,Map.of("Retry-After","7200"))) {
            var error=assertThrows(ApiException.class,()->adapter(server.uri(),Duration.ofSeconds(2)).complete(PROMPT));
            assertEquals(7200,error.retryAfterSeconds());
        }
        try(Stub server=new Stub(200,success(ANSWER,"stop"),0,Map.of())) {
            var bad=new GroqLiteraryAiAdapter(server.uri(),"invalid\nsynthetic",true,HttpClient.newHttpClient(),json,Duration.ofSeconds(2),0);
            var error=assertThrows(ApiException.class,()->bad.complete(PROMPT));
            assertEquals(503,error.status().value());assertFalse(error.getMessage().contains("invalid"));
            assertEquals(0,server.calls.get());
        }
    }
    @Test void authenticationServerAndRedirectErrorsAreSanitizedAndNeverRetried()throws Exception {
        for(int status:List.of(401,403,500,503,307)) {
            try(Stub server=new Stub(status,"PROVIDER_PRIVATE_ERROR",0,Map.of())) {
                var error=assertThrows(ApiException.class,()->adapter(server.uri(),Duration.ofSeconds(2)).complete(PROMPT));
                assertEquals("AI_PROVIDER_UNAVAILABLE",error.code());assertEquals(503,error.status().value());
                assertFalse(error.getMessage().contains("PROVIDER_PRIVATE_ERROR"));assertEquals(1,server.calls.get());
            }
        }
    }
    @Test void malformedEmptyReasoningOnlyTruncatedAndOversizedResponsesNeverBecomeAnswers()throws Exception {
        for(String response:List.of("not json","{}",success(" ","stop"),success(ANSWER,"length"),
            "{\"model\":\"openai/gpt-oss-120b\",\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"role\":\"assistant\",\"content\":null,\"reasoning\":\"INTERNAL_REASONING\"}}]}",
            "x".repeat(128001))) {
            try(Stub server=new Stub(200,response,0,Map.of())) {
                assertEquals(503,assertThrows(ApiException.class,()->adapter(server.uri(),Duration.ofSeconds(2)).complete(PROMPT)).status().value());
                assertEquals(1,server.calls.get());
            }
        }
    }
    @Test void wholeResponseHasBoundedTimeoutAndIsNotRetried()throws Exception {
        try(Stub server=new Stub(200,success(ANSWER,"stop"),800,Map.of())) {
            long start=System.nanoTime();
            assertEquals(503,assertThrows(ApiException.class,
                ()->adapter(server.uri(),Duration.ofMillis(150)).complete(PROMPT)).status().value());
            assertTrue(Duration.ofNanos(System.nanoTime()-start).toMillis()<1500);
            assertEquals(1,server.calls.get());
        }
    }
    private static final class Stub implements AutoCloseable {
        private final HttpServer server;
        private final java.util.concurrent.ExecutorService executor=Executors.newVirtualThreadPerTaskExecutor();
        final AtomicInteger calls=new AtomicInteger();
        AtomicReference<JsonNode> received=new AtomicReference<>();
        Stub(int status,String response,long pause,Map<String,String> headers)throws Exception {
            server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            server.setExecutor(executor);
            server.createContext("/chat",exchange->{
                calls.incrementAndGet();
                received.set(new JsonMapper().readTree(exchange.getRequestBody().readAllBytes()));
                try {
                    if(pause>0)Thread.sleep(pause);
                    headers.forEach((key,value)->exchange.getResponseHeaders().set(key,value));
                    byte[] bytes=response.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);
                } catch(InterruptedException interrupted) { Thread.currentThread().interrupt(); }
                finally { exchange.close(); }
            });
            server.start();
        }
        URI uri() { return URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/chat"); }
        public void close() { server.stop(0);executor.shutdownNow(); }
    }
}
