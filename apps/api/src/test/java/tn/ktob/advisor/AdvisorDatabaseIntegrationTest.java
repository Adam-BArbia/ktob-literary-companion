package tn.ktob.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tn.ktob.api.shared.ApiException;
import tn.ktob.reader.ConsentPolicyService;
import tn.ktob.reader.ReaderService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real HTTP/security/database integration; provider replies are explicitly test doubles. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true","ALLOWED_WEB_ORIGINS=https://ktob-web-front.vercel.app",
    "KTOB_QA_WEB_ORIGIN=https://ktob-verified-preview.vercel.app"})
@AutoConfigureMockMvc
@Import(AdvisorDatabaseIntegrationTest.TestBeans.class)
class AdvisorDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired AdvisorService advisor;
    @Autowired PlatformTransactionManager manager;
    @Autowired TestProvider provider;
    @Autowired TestConsent consent;
    private final JsonMapper json=new JsonMapper();
    private final UUID reader=UUID.randomUUID(),stranger=UUID.randomUUID();
    @BeforeEach void fakeProvider() {
        provider.calls.set(0);provider.configured=true;
        provider.answer=messages->"A concise test interpretation.";
        consent.setBeforeCheck(owner->{});
    }
    private JsonNode call(MockHttpServletRequestBuilder request,UUID who,String body,int expected)throws Exception {
        if(who!=null)request.with(jwt().jwt(j->j.subject(who.toString()).claim("role","authenticated")
            .audience(List.of("authenticated"))));
        if(body!=null)request.contentType(MediaType.APPLICATION_JSON).content(body);
        var response=mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse();
        if(response.getContentAsString().isEmpty())return json.nullNode();
        if(expected>=400)assertTrue(response.getContentType().startsWith("application/problem+json"));
        return json.readTree(response.getContentAsString());
    }
    private String conversation()throws Exception {
        return call(post("/api/v1/conversations"),reader,"{\"kind\":\"GENERAL\"}",201).path("data").path("id").asText();
    }
    private void allow(UUID owner)throws Exception {
        call(patch("/api/v1/me/privacy"),owner,"{\"aiProcessingOptIn\":true}",200);
    }
    private int messageCount(String chat) {
        return db.queryForObject("SELECT count(*) FROM app.conversation_messages WHERE conversation_id=?",Integer.class,UUID.fromString(chat));
    }
    @Test void privacyStartsFalseAndPartialEditsAreIndependentAndStrict()throws Exception {
        JsonNode settings=call(get("/api/v1/me/privacy"),reader,null,200).path("data");
        assertEquals(6,settings.size());settings.forEach(value->assertFalse(value.asBoolean()));
        var changed=call(patch("/api/v1/me/privacy"),reader,"{\"personalizationOptIn\":true,\"useReadingHistory\":true}",200).path("data");
        assertFalse(changed.path("aiProcessingOptIn").asBoolean());
        assertTrue(changed.path("personalizationOptIn").asBoolean());
        allow(reader);
        var revoked=call(patch("/api/v1/me/privacy"),reader,"{\"aiProcessingOptIn\":false}",200).path("data");
        assertFalse(revoked.path("aiProcessingOptIn").asBoolean());assertTrue(revoked.path("useReadingHistory").asBoolean());
        for(String invalid:List.of("{}","{\"aiProcessingOptIn\":null}","{\"aiProcessingOptIn\":\"true\"}",
            "{\"readerId\":\""+stranger+"\"}"))call(patch("/api/v1/me/privacy"),reader,invalid,422);
        assertFalse(call(get("/api/v1/me/privacy"),stranger,null,200).path("data").path("aiProcessingOptIn").asBoolean());
        assertEquals(0,provider.calls.get());
    }
    @Test void everyRouteAuthenticatesAndConversationOwnershipPrecedesConsent()throws Exception {
        String chat=conversation();
        for(var req:List.of(get("/api/v1/me/privacy"),patch("/api/v1/me/privacy"),
            get("/api/v1/conversations"),post("/api/v1/conversations"),
            get("/api/v1/conversations/"+chat+"/messages"),post("/api/v1/conversations/"+chat+"/messages")))
            call(req,null,null,401);
        call(get("/api/v1/conversations/"+chat+"/messages"),stranger,null,404);
        call(post("/api/v1/conversations/"+chat+"/messages"),stranger,"{\"body\":\"Question\"}",404);
        var denied=call(post("/api/v1/conversations/"+chat+"/messages"),reader,"{\"body\":\"Question\"}",403);
        assertEquals("AI_PROCESSING_CONSENT_REQUIRED",denied.path("code").asText());
        assertEquals(0,messageCount(chat));assertEquals(0,provider.calls.get());
        assertTrue(call(get("/api/v1/conversations"),stranger,null,200).path("data").isEmpty());
    }
    @Test void persistsRealTurnShapeAndCanonicalIdempotencyReplaysWithoutProviderCall()throws Exception {
        String chat=conversation(),key=UUID.randomUUID().toString();allow(reader);
        var sent=call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,
            "{\"body\":\"Discuss narrative voice\"}",201).path("data");
        assertEquals("READER",sent.path("userMessage").path("role").asText());
        assertEquals("ASSISTANT",sent.path("assistantMessage").path("role").asText());
        assertFalse(sent.path("assistantMessage").has("fullBookSpoilersConfirmed"));
        assertTrue(sent.path("proposalIds").isEmpty());assertEquals("NO_SPOILERS",sent.path("spoilerLevel").asText());
        assertEquals(2,messageCount(chat));
        var replay=call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,
            "{\"fullBookSpoilersConfirmed\":false,\"spoilerLevel\":\"NO_SPOILERS\",\"body\":\"Discuss narrative voice\"}",201).path("data");
        assertEquals(sent,replay);assertEquals(1,provider.calls.get());
        var conflict=call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,
            "{\"body\":\"Different question\"}",409);
        assertEquals("IDEMPOTENCY_KEY_REUSED",conflict.path("code").asText());
        call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key","not-a-uuid"),reader,"{\"body\":\"Question\"}",400);
        call(patch("/api/v1/me/privacy"),reader,"{\"aiProcessingOptIn\":false}",200);
        call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,
            "{\"body\":\"Discuss narrative voice\"}",403);
        assertEquals(2,messageCount(chat));
    }
    @Test void providerFailureAndUnavailableConfigurationNeverCommitOrCreateFalseReplay()throws Exception {
        String chat=conversation(),key=UUID.randomUUID().toString();allow(reader);
        provider.answer=messages->{throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"AI_PROVIDER_UNAVAILABLE","Unavailable.");};
        call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,"{\"body\":\"Question\"}",503);
        assertEquals(0,messageCount(chat));
        assertEquals(0,db.queryForObject("SELECT count(*) FROM app.message_idempotency WHERE conversation_id=?",Integer.class,UUID.fromString(chat)));
        provider.configured=false;
        call(post("/api/v1/conversations/"+chat+"/messages"),reader,"{\"body\":\"Question\"}",503);
        assertEquals(1,provider.calls.get());
        provider.configured=true;provider.answer=messages->"Recovered actual test response.";
        call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",key),reader,"{\"body\":\"Question\"}",201);
        assertEquals(2,messageCount(chat));
    }
    @Test void fullSpoilerPairsAreExcludedFromLaterDefaultContextAndNeverMakePermissionSticky()throws Exception {
        String chat=conversation();allow(reader);
        var contexts=new ArrayList<List<LiteraryAiPort.PromptMessage>>();
        provider.answer=messages->{contexts.add(List.copyOf(messages));
            return contexts.size()==1?"FULL_SPOILER_ASSISTANT_CANARY":"A safe general discussion.";};
        call(post("/api/v1/conversations/"+chat+"/messages"),reader,
            "{\"body\":\"FULL_SPOILER_READER_CANARY\",\"spoilerLevel\":\"FULL_BOOK_SPOILERS\"}",422);
        assertTrue(contexts.isEmpty());
        call(post("/api/v1/conversations/"+chat+"/messages"),reader,
            "{\"body\":\"FULL_SPOILER_READER_CANARY\",\"spoilerLevel\":\"FULL_BOOK_SPOILERS\",\"fullBookSpoilersConfirmed\":true}",201);
        call(post("/api/v1/conversations/"+chat+"/messages"),reader,"{\"body\":\"Explain narrative voice\"}",201);
        assertFalse(contexts.get(1).toString().contains("FULL_SPOILER_READER_CANARY"));
        assertFalse(contexts.get(1).toString().contains("FULL_SPOILER_ASSISTANT_CANARY"));
        assertTrue(contexts.get(1).getFirst().content().contains("NO_SPOILERS for THIS response"));
        var messages=call(get("/api/v1/conversations/"+chat+"/messages"),reader,null,200).path("data");
        assertEquals(4,messages.size());assertEquals("NO_SPOILERS",messages.get(0).path("spoilerLevel").asText());
        assertEquals("FULL_BOOK_SPOILERS",messages.get(3).path("spoilerLevel").asText());
    }
    @Test void bookContextChecksPrivateOwnershipAndNeverReadsNotesEvenWithAllScopeFlags()throws Exception {
        String work=call(post("/api/v1/catalog/manual-works"),reader,
            "{\"title\":\"QA book metadata\",\"authors\":[\"QA Author\"],\"language\":\"fr\"}",201).path("data").path("id").asText();
        call(post("/api/v1/conversations"),stranger,"{\"kind\":\"BOOK_MAIN\",\"workId\":\""+work+"\"}",404);
        call(post("/api/v1/conversations"),reader,"{\"kind\":\"GENERAL\",\"workId\":\""+work+"\"}",422);
        call(post("/api/v1/conversations"),reader,"{\"kind\":\"BOOK_MAIN\"}",422);
        call(post("/api/v1/conversations"),reader,"{\"kind\":\"GENERAL\",\"title\":\" \"}",422);
        String entry=call(post("/api/v1/library"),reader,"{\"workId\":\""+work+"\"}",201).path("data").path("id").asText();
        String reading=call(post("/api/v1/library/"+entry+"/experiences"),reader,"{\"status\":\"CURRENTLY_READING\"}",201).path("data").path("id").asText();
        call(post("/api/v1/experiences/"+reading+"/journal"),reader,
            "{\"kind\":\"NOTE\",\"body\":\"PRIVATE_JOURNAL_CANARY\",\"allowForPersonalization\":true}",201);
        call(patch("/api/v1/me/privacy"),reader,"{\"aiProcessingOptIn\":true,\"personalizationOptIn\":true,\"useAllowedJournal\":true,\"useReadingHistory\":true,\"useExplicitPreferences\":true,\"useApprovedMemories\":true}",200);
        call(delete("/api/v1/library/"+entry),reader,null,204);
        var chat=call(post("/api/v1/conversations"),reader,"{\"kind\":\"BOOK_MAIN\",\"workId\":\""+work+"\"}",201).path("data");
        assertEquals("QA book metadata",chat.path("title").asText());
        var captured=new ArrayList<List<LiteraryAiPort.PromptMessage>>();
        provider.answer=messages->{captured.add(List.copyOf(messages));return "Une interprétation prudente.";};
        call(post("/api/v1/conversations/"+chat.path("id").asText()+"/messages"),reader,"{\"body\":\"Parlons du style\"}",201);
        assertTrue(captured.getFirst().toString().contains("QA book metadata"));
        assertFalse(captured.getFirst().toString().contains("PRIVATE_JOURNAL_CANARY"));
        assertFalse(captured.getFirst().toString().contains(reader.toString()));
        assertEquals(1,db.queryForObject("SELECT count(*) FROM app.journal_entries WHERE experience_id=?",Integer.class,UUID.fromString(reading)));
    }
    @Test void listPaginationHasStableMessageOrderAndScopedCursors()throws Exception {
        String first=conversation(),second=conversation();allow(reader);
        var page=call(get("/api/v1/conversations").param("limit","1"),reader,null,200);
        String cursor=page.path("meta").path("nextCursor").asText();
        var next=call(get("/api/v1/conversations").param("limit","1").param("cursor",cursor),reader,null,200);
        assertNotEquals(page.path("data").get(0).path("id"),next.path("data").get(0).path("id"));
        call(get("/api/v1/conversations").param("cursor",cursor),stranger,null,400);
        for(int i=0;i<2;i++)call(post("/api/v1/conversations/"+first+"/messages"),reader,"{\"body\":\"Question "+i+"\"}",201);
        var messages=call(get("/api/v1/conversations/"+first+"/messages").param("limit","1"),reader,null,200);
        assertEquals("ASSISTANT",messages.path("data").get(0).path("role").asText());
        String messageCursor=messages.path("meta").path("nextCursor").asText();
        var older=call(get("/api/v1/conversations/"+first+"/messages").param("limit","1").param("cursor",messageCursor),reader,null,200);
        assertEquals("READER",older.path("data").get(0).path("role").asText());
        assertEquals("Question 1",older.path("data").get(0).path("body").asText());
        call(get("/api/v1/conversations/"+second+"/messages").param("cursor",messageCursor),reader,null,400);
    }
    @Test void completedRevocationImmediatelyBeforeDispatchPreventsProviderCall()throws Exception {
        String chat=conversation();allow(reader);
        AtomicInteger checks=new AtomicInteger();
        consent.setBeforeCheck(owner->{
            if(reader.equals(owner) && checks.incrementAndGet()==3) {
                var separate=new TransactionTemplate(manager);
                separate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                separate.execute(status->{db.update("UPDATE app.privacy_settings SET ai_processing_opt_in=false WHERE reader_id=?",reader);return null;});
            }
        });
        call(post("/api/v1/conversations/"+chat+"/messages"),reader,"{\"body\":\"A question\"}",403);
        assertEquals(3,checks.get());assertEquals(0,messageCount(chat));assertEquals(0,provider.calls.get());
    }
    @Test void busyInferenceRejectsConcurrentSendAndDoesNotBlockConsentRevocationOrLibraryReads()throws Exception {
        String chat=conversation();allow(reader);
        CountDownLatch entered=new CountDownLatch(1),release=new CountDownLatch(1);
        provider.answer=messages->{entered.countDown();assertTrue(release.await(5,TimeUnit.SECONDS));return "Already dispatched reply.";};
        try(var executor=Executors.newSingleThreadExecutor()) {
            var pending=executor.submit(()->advisor.send(reader,UUID.fromString(chat),"{\"body\":\"Question\"}",UUID.randomUUID().toString()));
            assertTrue(entered.await(3,TimeUnit.SECONDS));
            var busy=assertThrows(ApiException.class,()->advisor.send(reader,UUID.fromString(chat),"{\"body\":\"Another\"}",null));
            assertEquals(429,busy.status().value());
            assertTimeoutPreemptively(Duration.ofSeconds(2),()->{
                call(patch("/api/v1/me/privacy"),reader,"{\"aiProcessingOptIn\":false}",200);
                call(get("/api/v1/library"),reader,null,200);
            });
            release.countDown();assertNotNull(pending.get(3,TimeUnit.SECONDS));
            call(post("/api/v1/conversations/"+chat+"/messages"),reader,"{\"body\":\"After revoke\"}",403);
            assertEquals(1,provider.calls.get());
        } finally { release.countDown(); }
    }
    @Test void failedAssistantInsertRollsBackReaderMessageAndIdempotencyRecord()throws Exception {
        String chat=conversation();allow(reader);
        db.execute("CREATE FUNCTION app.test_reject_assistant() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.role='ASSISTANT' THEN RAISE EXCEPTION 'synthetic persistence failure'; END IF; RETURN NEW; END $$");
        db.execute("CREATE TRIGGER test_reject_assistant BEFORE INSERT ON app.conversation_messages FOR EACH ROW EXECUTE FUNCTION app.test_reject_assistant()");
        try {
            call(post("/api/v1/conversations/"+chat+"/messages").header("Idempotency-Key",UUID.randomUUID().toString()),reader,"{\"body\":\"Question\"}",500);
            assertEquals(0,messageCount(chat));
            assertEquals(0,db.queryForObject("SELECT count(*) FROM app.message_idempotency WHERE conversation_id=?",Integer.class,UUID.fromString(chat)));
        } finally {
            db.execute("DROP TRIGGER test_reject_assistant ON app.conversation_messages");
            db.execute("DROP FUNCTION app.test_reject_assistant()");
        }
    }
    @Test void newTablesDenyBrowserRolesAndRuntimeDeletion()throws Exception {
        for(String table:List.of("conversations","conversation_messages","message_idempotency")) {
            for(String role:List.of("anon","authenticated"))assertFalse(db.queryForObject(
                "SELECT has_table_privilege(?,?,'SELECT')",Boolean.class,role,"app."+table));
            assertTrue(db.queryForObject("SELECT has_table_privilege('ktob_app',?,'INSERT')",Boolean.class,"app."+table));
            assertFalse(db.queryForObject("SELECT has_table_privilege('ktob_app',?,'DELETE')",Boolean.class,"app."+table));
        }
        assertTrue(db.queryForObject("SELECT has_column_privilege('ktob_app','app.conversations','title','UPDATE')",Boolean.class));
        assertFalse(db.queryForObject("SELECT has_column_privilege('ktob_app','app.conversations','reader_id','UPDATE')",Boolean.class));
        String chat=conversation();
        // The baseline runtime role's schema usage is configured separately in hosted production.
        db.execute("GRANT USAGE ON SCHEMA app TO ktob_app");
        new TransactionTemplate(manager).execute(status->{
            db.execute("SET LOCAL ROLE ktob_app");
            assertEquals(UUID.fromString(chat),db.queryForObject(
                "SELECT id FROM app.conversations WHERE id=? FOR UPDATE",UUID.class,UUID.fromString(chat)));
            return null;
        });
    }
    @Test void productionOriginCorsAllowsIdempotencyHeaderWithoutAllowingUnknownOrigins()throws Exception {
        mvc.perform(options("/api/v1/conversations/"+UUID.randomUUID()+"/messages")
            .header("Origin","https://ktob-web-front.vercel.app").header("Access-Control-Request-Method","POST")
            .header("Access-Control-Request-Headers","authorization,content-type,idempotency-key"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","https://ktob-web-front.vercel.app"))
            .andExpect(header().string("Access-Control-Allow-Headers","authorization, content-type, idempotency-key"));
        mvc.perform(options("/api/v1/conversations/"+UUID.randomUUID()+"/messages")
            .header("Origin","https://ktob-verified-preview.vercel.app").header("Access-Control-Request-Method","POST")
            .header("Access-Control-Request-Headers","authorization,content-type,idempotency-key"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","https://ktob-verified-preview.vercel.app"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
        mvc.perform(options("/api/v1/conversations/"+UUID.randomUUID()+"/messages")
            .header("Origin","https://another-preview.vercel.app").header("Access-Control-Request-Method","POST")
            .header("Access-Control-Request-Headers","authorization,content-type,idempotency-key"))
            .andExpect(status().isForbidden());
        mvc.perform(options("/api/v1/conversations/"+UUID.randomUUID()+"/messages")
            .header("Origin","https://untrusted.invalid").header("Access-Control-Request-Method","POST")
            .header("Access-Control-Request-Headers","authorization,content-type,idempotency-key"))
            .andExpect(status().isForbidden());
    }
    @TestConfiguration(proxyBeanMethods=false)
    static class TestBeans {
        @Bean @Primary TestProvider testProvider() { return new TestProvider(); }
        @Bean @Primary TestConsent testConsent(JdbcTemplate db,ReaderService readers) { return new TestConsent(db,readers); }
    }
    static class TestConsent extends ConsentPolicyService {
        volatile java.util.function.Consumer<UUID> beforeCheck=reader->{};
        TestConsent(JdbcTemplate db,ReaderService readers) { super(db,readers); }
        public void setBeforeCheck(java.util.function.Consumer<UUID> action) { beforeCheck=action; }
        @Override public void requireProcessingConsent(UUID reader) {
            beforeCheck.accept(reader);
            super.requireProcessingConsent(reader);
        }
    }
    static class TestProvider implements LiteraryAiPort {
        @FunctionalInterface interface Answer { String apply(List<PromptMessage> messages)throws Exception; }
        final AtomicInteger calls=new AtomicInteger();
        volatile boolean configured=true;
        volatile Answer answer=messages->"Explicit test double";
        public boolean available() { return configured; }
        public String complete(List<PromptMessage> messages) {
            calls.incrementAndGet();
            try { return answer.apply(messages); }
            catch(RuntimeException ex) { throw ex; }
            catch(Exception ex) { Thread.currentThread().interrupt();throw AdvisorService.unavailable(); }
        }
    }
}
