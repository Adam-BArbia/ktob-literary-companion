package tn.ktob.advisor;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tn.ktob.api.shared.ApiException;

/** Fixed-host, stateless Groq inference. Never logs headers, prompt/answer content or provider errors. */
@Component
@ConditionalOnProperty(name="ktob.persistence.enabled", havingValue="true")
public final class GroqLiteraryAiAdapter implements LiteraryAiPort {
    static final String MODEL="openai/gpt-oss-120b";
    private static final Logger LOG=LoggerFactory.getLogger(GroqLiteraryAiAdapter.class);
    private static final int MAX_RESPONSE_BYTES=128000;
    private final URI endpoint;
    private final String key;
    private final boolean qualified;
    private final HttpClient http;
    private final JsonMapper json;
    private final Duration timeout;
    private final long minSpacingMillis;
    private volatile long nextAllowedAt;

    @Autowired
    public GroqLiteraryAiAdapter(JsonMapper json,@Value("${GROQ_API_KEY:}") String key,
            @Value("${KTOB_GROQ_QUALIFIED:false}") boolean qualified) {
        this(URI.create("https://api.groq.com/openai/v1/chat/completions"),key,qualified,
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NEVER).build(),json,Duration.ofSeconds(30),2000);
        LOG.info("KTOB Groq configuration: keyConfigured={}, qualificationConfirmed={}",
            key!=null && !key.isBlank(),qualified);
    }

    /** Package-private test injection accepts only an in-process test endpoint; never configured from user input. */
    GroqLiteraryAiAdapter(URI endpoint,String key,boolean qualified,HttpClient http,JsonMapper json,
            Duration timeout,long minSpacingMillis) {
        this.endpoint=endpoint;this.key=key;this.qualified=qualified;this.http=http;
        this.json=json;this.timeout=timeout;this.minSpacingMillis=minSpacingMillis;
    }
    @Override public boolean available() { return qualified && key!=null && !key.isBlank(); }

    @Override public String complete(List<PromptMessage> messages) {
        if(!available())throw AdvisorService.unavailable();
        long now=System.currentTimeMillis();
        if(now<nextAllowedAt)throw limited((int)Math.max(1,(nextAllowedAt-now+999)/1000));
        nextAllowedAt=now+minSpacingMillis;
        CompletableFuture<HttpResponse<byte[]>> pending=null;
        long began=System.nanoTime();
        try {
            var payload=Map.of("model",MODEL,"messages",messages,"temperature",0.4,
                "max_completion_tokens",1024,"reasoning_effort","low","include_reasoning",false,"stream",false);
            HttpRequest request=HttpRequest.newBuilder(endpoint).timeout(timeout)
                .header("Authorization","Bearer "+key).header("Content-Type","application/json")
                .header("Accept","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
            pending=http.sendAsync(request,info->new BoundedBody(MAX_RESPONSE_BYTES));
            HttpResponse<byte[]> response=pending.get(timeout.toMillis(),TimeUnit.MILLISECONDS);
            int status=response.statusCode();
            if(status==429) {
                int retry=retryDelay(response);
                nextAllowedAt=System.currentTimeMillis()+retry*1000L;
                LOG.warn("KTOB Groq response: status=429, retryAfterSeconds={}",retry);
                throw limited(retry);
            }
            if(status!=200) {
                LOG.warn("KTOB Groq response: status={}",status);
                throw AdvisorService.unavailable();
            }
            JsonNode data=json.readTree(response.body());
            JsonNode choices=data.path("choices");
            if(!choices.isArray() || choices.size()!=1 || !MODEL.equals(data.path("model").asText("")))
                throw AdvisorService.unavailable();
            JsonNode choice=choices.get(0),message=choice.path("message"),content=message.path("content");
            if(!"stop".equals(choice.path("finish_reason").asText("")) ||
                !"assistant".equals(message.path("role").asText("")) || !content.isTextual() ||
                content.asText().isBlank() || content.asText().length()>16000 ||
                (message.has("tool_calls") && !message.path("tool_calls").isNull() && message.path("tool_calls").size()>0))
                throw AdvisorService.unavailable();
            LOG.info("KTOB Groq inference succeeded: model={}, elapsedMs={}, requestLimit={}, tokenLimit={}",
                MODEL,TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-began),
                numericHeader(response,"x-ratelimit-limit-requests"),numericHeader(response,"x-ratelimit-limit-tokens"));
            // Only final content is returned; any unexpected reasoning field is not stored or sent to the browser.
            return content.asText().strip();
        } catch(ApiException ex) {
            throw ex;
        } catch(InterruptedException ex) {
            Thread.currentThread().interrupt();
            if(pending!=null)pending.cancel(true);
            LOG.warn("KTOB Groq inference interrupted");
            throw AdvisorService.unavailable();
        } catch(Exception ex) {
            if(pending!=null)pending.cancel(true);
            LOG.warn("KTOB Groq inference failed: category={}",ex.getClass().getSimpleName());
            throw AdvisorService.unavailable();
        }
    }
    private static long numericHeader(HttpResponse<?> response,String name) {
        String value=response.headers().firstValue(name).orElse("");
        if(!value.matches("[0-9]{1,12}"))return -1;
        try { return Long.parseLong(value); } catch(NumberFormatException ex) { return -1; }
    }
    private static int retryDelay(HttpResponse<?> response) {
        long seconds=numericHeader(response,"retry-after");
        if(seconds<0) {
            try {
                Instant after=ZonedDateTime.parse(response.headers().firstValue("retry-after").orElse(""),
                    DateTimeFormatter.RFC_1123_DATE_TIME).toInstant();
                seconds=Math.max(1,Duration.between(Instant.now(),after).toSeconds()+1);
            } catch(RuntimeException ignored) { seconds=60; }
        }
        return (int)Math.max(1,Math.min(seconds,86400));
    }
    private static ApiException limited(int seconds) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS,"AI_RATE_LIMITED",
            "The free AI allowance is temporarily busy. Please wait before trying again.",Math.min(seconds,86400));
    }
    private static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result=new CompletableFuture<>();
        private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        private final int limit;
        private Flow.Subscription subscription;
        BoundedBody(int limit) { this.limit=limit; }
        public CompletionStage<byte[]> getBody() { return result; }
        public void onSubscribe(Flow.Subscription value) { subscription=value;value.request(1); }
        public void onNext(List<ByteBuffer> chunks) {
            for(ByteBuffer chunk:chunks) {
                if(chunk.remaining()>limit-bytes.size()) {
                    subscription.cancel();result.completeExceptionally(new IllegalStateException("Provider response too large"));return;
                }
                byte[] part=new byte[chunk.remaining()];chunk.get(part);bytes.writeBytes(part);
            }
            subscription.request(1);
        }
        public void onError(Throwable error) { result.completeExceptionally(error); }
        public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
