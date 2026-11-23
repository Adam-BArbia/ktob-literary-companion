package tn.ktob.reading;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tn.ktob.api.shared.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Full HTTP/database boundary tests against a disposable PostgreSQL only. */
@EnabledIfEnvironmentVariable(named="KTOB_TEST_POSTGRES",matches="true")
@SpringBootTest(properties={"ktob.persistence.enabled=true"})
@AutoConfigureMockMvc
class ReadingJournalDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired ReadingService readings;
    private final UUID owner=UUID.randomUUID(), stranger=UUID.randomUUID();
    private final JsonMapper mapper=new JsonMapper();

    private RequestPostProcessor as(UUID who){
        return jwt().jwt(j->j.subject(who.toString()).claim("role","authenticated")
            .audience(List.of("authenticated")));
    }

    private JsonNode call(MockHttpServletRequestBuilder request,UUID who,String body,int expected)throws Exception{
        if(who!=null)request.with(as(who));
        if(body!=null)request.contentType(MediaType.APPLICATION_JSON).content(body);
        var response=mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse();
        if(response.getContentAsString().isEmpty())return mapper.nullNode();
        if(expected>=400)assertTrue(response.getContentType().startsWith("application/problem+json"));
        return mapper.readTree(response.getContentAsString());
    }

    private String entry()throws Exception{
        String work=call(post("/api/v1/catalog/manual-works"),owner,
            "{\"title\":\"Reading test "+UUID.randomUUID()+"\",\"authors\":[\"Test Author\"]}",201)
            .path("data").path("id").asText();
        return call(post("/api/v1/library"),owner,"{\"workId\":\""+work+"\"}",201)
            .path("data").path("id").asText();
    }

    private String experience(String entry,String body)throws Exception{
        return call(post("/api/v1/library/"+entry+"/experiences"),owner,body,201).path("data").path("id").asText();
    }

    private String note(String experience,String kind,String body)throws Exception{
        return call(post("/api/v1/experiences/"+experience+"/journal"),owner,
            mapper.writeValueAsString(java.util.Map.of("kind",kind,"body",body,"allowForPersonalization",false)),201)
            .path("data").path("id").asText();
    }

    @Test void historicalRatingReviewQuoteAndFavoritePersistIndependently()throws Exception{
        String entry=entry();
        String reading=experience(entry,"{\"status\":\"FINISHED\",\"historicalImport\":true,\"finishedOn\":\"2026-11-23\",\"rating\":4.5}");
        String review=note(reading,"REVIEW","A thoughtful first review.");
        String quote=note(reading,"QUOTE","A quotation recorded by its reader.");
        JsonNode stored=call(get("/api/v1/experiences/"+reading),owner,null,200).path("data");
        assertEquals(4.5,stored.path("rating").asDouble());
        assertTrue(stored.path("progressPercent").isNull());
        assertFalse(stored.has("createdAt")); // No undocumented response fields.
        call(patch("/api/v1/experiences/"+reading),owner,"{\"rating\":5}",200);
        assertEquals(5,call(get("/api/v1/experiences/"+reading),owner,null,200).path("data").path("rating").asDouble());
        var edited=call(patch("/api/v1/journal/"+review),owner,"{\"body\":\"My revised review.\"}",200).path("data");
        assertEquals("REVIEW",edited.path("kind").asText());
        assertFalse(edited.path("allowForPersonalization").asBoolean());
        call(delete("/api/v1/journal/"+quote),owner,null,204);
        var notes=call(get("/api/v1/experiences/"+reading+"/journal"),owner,null,200).path("data");
        assertEquals(1,notes.size());assertEquals("My revised review.",notes.get(0).path("body").asText());
        call(patch("/api/v1/library/"+entry),owner,"{\"favorite\":true}",200);
        assertTrue(call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("favorite").asBoolean());
        call(patch("/api/v1/experiences/"+reading),owner,"{\"rating\":null}",200);
        assertTrue(call(get("/api/v1/experiences/"+reading),owner,null,200).path("data").path("rating").isNull());
        assertEquals("FINISHED",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
        assertEquals(1,db.queryForObject("SELECT count(*) FROM app.reading_experiences WHERE id=?",Integer.class,UUID.fromString(reading)));
    }

    @Test void lifecyclePreservesRereadsAndDoesNotDeriveStatusFromRatingOrProgress()throws Exception{
        String entry=entry();
        for(String initial:List.of("PAUSED","FINISHED","DID_NOT_FINISH")){
            var bad=call(post("/api/v1/library/"+entry+"/experiences"),owner,"{\"status\":\""+initial+"\"}",422);
            assertEquals("HISTORICAL_IMPORT_REQUIRED",bad.path("code").asText());
        }
        call(post("/api/v1/library/"+entry+"/experiences"),owner,"{\"status\":\"WANT_TO_READ\"}",422);
        String reading=experience(entry,"{\"status\":\"CURRENTLY_READING\",\"rating\":4.5,\"progressPercent\":100}");
        assertEquals("CURRENTLY_READING",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
        call(patch("/api/v1/experiences/"+reading),owner,"{\"status\":\"PAUSED\"}",200);
        var conflict=call(post("/api/v1/library/"+entry+"/experiences"),owner,"{\"status\":\"CURRENTLY_READING\"}",409);
        assertEquals("READING_ALREADY_OPEN",conflict.path("code").asText());
        call(patch("/api/v1/experiences/"+reading),owner,"{\"status\":\"CURRENTLY_READING\",\"progressPercent\":12}",200);
        var finished=call(patch("/api/v1/experiences/"+reading),owner,"{\"status\":\"FINISHED\"}",200).path("data");
        assertEquals(12,finished.path("progressPercent").asInt());
        call(patch("/api/v1/experiences/"+reading),owner,"{\"status\":\"CURRENTLY_READING\"}",422);
        call(patch("/api/v1/experiences/"+reading),owner,"{\"status\":\"DID_NOT_FINISH\"}",422);
        String reread=experience(entry,"{\"status\":\"CURRENTLY_READING\"}");
        assertNotEquals(reading,reread);
        assertEquals(4.5,call(get("/api/v1/experiences/"+reading),owner,null,200).path("data").path("rating").asDouble());
        assertTrue(call(get("/api/v1/experiences/"+reread),owner,null,200).path("data").path("rating").isNull());
        call(patch("/api/v1/experiences/"+reread),owner,"{\"status\":\"DID_NOT_FINISH\"}",200);
        call(patch("/api/v1/experiences/"+reread),owner,"{\"status\":\"PAUSED\"}",422);
    }

    @Test void invalidRatingProgressDatesAndPatchTypesLeaveRecordUnchanged()throws Exception{
        String reading=experience(entry(),"{\"status\":\"FINISHED\",\"historicalImport\":true,\"rating\":4.5}");
        for(String rating:List.of("0","0.5","4.45","4.49","5.5","4.5000000000000000001","\"4.5\"","true"))
            call(patch("/api/v1/experiences/"+reading),owner,"{\"rating\":"+rating+"}",422);
        for(String body:List.of("{}","{\"status\":null}","{\"progressPercent\":1.5}","{\"progressPercent\":101}",
            "{\"progressPercent\":-1}","{\"startedOn\":\"2026-02-30\"}","{\"editionId\":\"1-1-1-1-1\"}",
            "{\"startedOn\":\"2026-11-24\",\"finishedOn\":\"2026-11-23\"}","{\"historicalImport\":true}"))
            call(patch("/api/v1/experiences/"+reading),owner,body,422);
        call(patch("/api/v1/experiences/"+reading),owner,"{\"rating\":4} {\"rating\":1}",400);
        assertEquals(4.5,call(get("/api/v1/experiences/"+reading),owner,null,200).path("data").path("rating").asDouble());
        for(String valid:List.of("1","1.5","2","2.5","3","3.5","4","4.5","5","null"))
            call(patch("/api/v1/experiences/"+reading),owner,"{\"rating\":"+valid+"}",200);
    }

    @Test void favoritePatchPreservesOtherFieldsAndValidatesEditionOwnership()throws Exception{
        String entry=entry(),other=entry();
        UUID work=db.queryForObject("SELECT work_id FROM app.library_entries WHERE id=?",UUID.class,UUID.fromString(entry));
        UUID otherWork=db.queryForObject("SELECT work_id FROM app.library_entries WHERE id=?",UUID.class,UUID.fromString(other));
        UUID edition=UUID.randomUUID(),wrongEdition=UUID.randomUUID();
        db.update("INSERT INTO app.catalog_editions(id,work_id) VALUES (?,?),(?,?)",edition,work,wrongEdition,otherWork);
        call(patch("/api/v1/library/"+entry),owner,"{\"acquisitionIntention\":true,\"preferredEditionId\":\""+edition+"\"}",200);
        var favorite=call(patch("/api/v1/library/"+entry),owner,"{\"favorite\":true}",200).path("data");
        assertTrue(favorite.path("acquisitionIntention").asBoolean());
        assertEquals(edition.toString(),favorite.path("preferredEditionId").asText());
        call(patch("/api/v1/library/"+entry),owner,"{\"preferredEditionId\":\""+wrongEdition+"\"}",422);
        call(post("/api/v1/library/"+entry+"/experiences"),owner,
            "{\"status\":\"CURRENTLY_READING\",\"editionId\":\""+wrongEdition+"\"}",422);
        String reading=experience(entry,"{\"status\":\"CURRENTLY_READING\",\"editionId\":\""+edition+"\"}");
        call(patch("/api/v1/experiences/"+reading),owner,"{\"editionId\":\""+wrongEdition+"\"}",422);
        call(patch("/api/v1/experiences/"+reading),owner,"{\"editionId\":null}",200);
        call(patch("/api/v1/library/"+entry),owner,"{\"favorite\":false,\"preferredEditionId\":null}",200);
        for(String body:List.of("{}","{\"favorite\":null}","{\"favorite\":\"true\"}","{\"readerId\":\""+stranger+"\"}"))
            call(patch("/api/v1/library/"+entry),owner,body,422);
        var finalValue=call(get("/api/v1/library/"+entry),owner,null,200).path("data");
        assertFalse(finalValue.path("favorite").asBoolean());assertTrue(finalValue.path("acquisitionIntention").asBoolean());
        assertTrue(finalValue.path("preferredEditionId").isNull());
    }

    @Test void journalSupportsAllKindsAndRejectsInvalidOrImplicitConsent()throws Exception{
        String reading=experience(entry(),"{\"status\":\"CURRENTLY_READING\"}");
        for(String kind:List.of("REVIEW","REFLECTION","QUOTE","NOTE","EMOTION"))note(reading,kind,"Text for "+kind);
        call(post("/api/v1/experiences/"+reading+"/journal"),owner,"{\"kind\":\"NOTE\",\"body\":\"Private\"}",422);
        String note=note(reading,"NOTE","Original preserved.");
        for(String patch:List.of("{}","{\"kind\":null}","{\"kind\":\"SPOILER\"}","{\"body\":null}",
            "{\"body\":\"   \"}","{\"emotionTags\":null}","{\"emotionTags\":[null]}","{\"emotionTags\":[\"\"]}",
            "{\"allowForPersonalization\":null}","{\"allowForPersonalization\":\"false\"}","{\"spoiler\":true}"))
            call(patch("/api/v1/journal/"+note),owner,patch,422);
        call(patch("/api/v1/journal/"+note),owner,mapper.writeValueAsString(java.util.Map.of("body","x".repeat(20001))),422);
        call(patch("/api/v1/journal/"+note),owner,mapper.writeValueAsString(java.util.Map.of("emotionTags",List.of("x".repeat(41)))),422);
        call(patch("/api/v1/journal/"+note),owner,mapper.writeValueAsString(java.util.Map.of("emotionTags",java.util.Collections.nCopies(13,"happy"))),422);
        var changed=call(patch("/api/v1/journal/"+note),owner,"{\"emotionTags\":[\"wistful\"],\"allowForPersonalization\":false}",200).path("data");
        assertEquals("Original preserved.",changed.path("body").asText());
        assertFalse(changed.path("allowForPersonalization").asBoolean());
        assertEquals("wistful",changed.path("emotionTags").get(0).asText());
        assertEquals(6,call(get("/api/v1/experiences/"+reading+"/journal"),owner,null,200).path("data").size());
    }

    @Test void everyNestedRouteEnforcesOwnerBeforeArchiveAndAnonymousAuthentication()throws Exception{
        String entry=entry();String reading=experience(entry,"{\"status\":\"CURRENTLY_READING\"}");
        String note=note(reading,"NOTE","Never visible to another reader.");
        call(delete("/api/v1/library/"+entry),owner,null,204);
        for(UUID who:List.of(stranger)){
            call(get("/api/v1/library/"+entry+"/experiences"),who,null,404);
            call(post("/api/v1/library/"+entry+"/experiences"),who,"{\"status\":\"CURRENTLY_READING\"}",404);
            call(get("/api/v1/experiences/"+reading),who,null,404);
            call(patch("/api/v1/experiences/"+reading),who,"{\"rating\":5}",404);
            call(get("/api/v1/experiences/"+reading+"/journal"),who,null,404);
            call(post("/api/v1/experiences/"+reading+"/journal"),who,"{\"kind\":\"NOTE\",\"body\":\"injected\",\"allowForPersonalization\":false}",404);
            call(patch("/api/v1/journal/"+note),who,"{\"body\":\"injected\"}",404);
            call(delete("/api/v1/journal/"+note),who,null,404);
            call(patch("/api/v1/library/"+entry),who,"{\"favorite\":true}",404);
        }
        for(var request:List.of(get("/api/v1/library/"+entry+"/experiences"),post("/api/v1/library/"+entry+"/experiences"),
            get("/api/v1/experiences/"+reading),patch("/api/v1/experiences/"+reading),get("/api/v1/experiences/"+reading+"/journal"),
            post("/api/v1/experiences/"+reading+"/journal"),patch("/api/v1/journal/"+note),delete("/api/v1/journal/"+note),patch("/api/v1/library/"+entry)))
            call(request,null,null,401);
        assertEquals("Never visible to another reader.",call(get("/api/v1/experiences/"+reading+"/journal"),owner,null,200)
            .path("data").get(0).path("body").asText());
    }

    @Test void archivePreservesHistoryAndBlocksEveryChildMutationUntilRestored()throws Exception{
        String entry=entry();String reading=experience(entry,"{\"status\":\"CURRENTLY_READING\"}");
        String note=note(reading,"NOTE","Keep me.");
        call(delete("/api/v1/library/"+entry),owner,null,204);
        call(get("/api/v1/library/"+entry+"/experiences"),owner,null,200);
        call(get("/api/v1/experiences/"+reading),owner,null,200);
        call(get("/api/v1/experiences/"+reading+"/journal"),owner,null,200);
        for(var request:List.of(post("/api/v1/library/"+entry+"/experiences"),patch("/api/v1/experiences/"+reading),
            post("/api/v1/experiences/"+reading+"/journal"),patch("/api/v1/journal/"+note),patch("/api/v1/library/"+entry))){
            assertEquals("LIBRARY_ENTRY_ARCHIVED",call(request,owner,"{}",409).path("code").asText());
        }
        assertEquals("LIBRARY_ENTRY_ARCHIVED",call(delete("/api/v1/journal/"+note),owner,null,409).path("code").asText());
        call(post("/api/v1/library/"+entry+"/restore"),owner,null,200);
        call(patch("/api/v1/journal/"+note),owner,"{\"body\":\"Still here.\"}",200);
        assertEquals("CURRENTLY_READING",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
    }

    @Test void shelfUsesReadingDatesWithOpenExperienceTakingPriority()throws Exception{
        String entry=entry();
        experience(entry,"{\"status\":\"FINISHED\",\"historicalImport\":true,\"finishedOn\":\"2026-11-20\"}");
        experience(entry,"{\"status\":\"DID_NOT_FINISH\",\"historicalImport\":true,\"finishedOn\":\"2020-01-01\"}");
        assertEquals("FINISHED",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
        assertEquals(entry,call(get("/api/v1/library").param("status","FINISHED"),owner,null,200).path("data").get(0).path("id").asText());
        String open=experience(entry,"{\"status\":\"PAUSED\",\"historicalImport\":true}");
        assertEquals("PAUSED",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
        call(patch("/api/v1/experiences/"+open),owner,"{\"status\":\"DID_NOT_FINISH\",\"finishedOn\":\"2026-11-23\"}",200);
        assertEquals("DID_NOT_FINISH",call(get("/api/v1/library/"+entry),owner,null,200).path("data").path("shelfStatus").asText());
    }

    @Test void keysetPaginationHasNoDuplicatesAndCannotCrossReaderOrParent()throws Exception{
        String firstEntry=entry(),secondEntry=entry(),thirdEntry=entry();
        Set<String> entries=Set.of(firstEntry,secondEntry,thirdEntry);
        Set<String> seen=new HashSet<>();String cursor=null;
        for(int n=0;n<3;n++){
            var req=get("/api/v1/library").param("limit","1");if(cursor!=null)req.param("cursor",cursor);
            JsonNode page=call(req,owner,null,200);assertTrue(seen.add(page.path("data").get(0).path("id").asText()));
            cursor=page.path("meta").path("nextCursor").isNull()?null:page.path("meta").path("nextCursor").asText();
            if(n==0){
                call(get("/api/v1/library").param("cursor",cursor),stranger,null,400);
                call(get("/api/v1/library").param("cursor",cursor).param("includeArchived","true"),owner,null,400);
            }
        }
        assertEquals(entries,seen);assertNull(cursor);
        String first=experience(firstEntry,"{\"status\":\"FINISHED\",\"historicalImport\":true}");
        String second=experience(firstEntry,"{\"status\":\"FINISHED\",\"historicalImport\":true}");
        db.update("UPDATE app.reading_experiences SET created_at='2026-11-23T12:00:00Z' WHERE library_entry_id=?",UUID.fromString(firstEntry));
        var page=call(get("/api/v1/library/"+firstEntry+"/experiences").param("limit","1"),owner,null,200);
        String readingCursor=page.path("meta").path("nextCursor").asText();
        var next=call(get("/api/v1/library/"+firstEntry+"/experiences").param("limit","1").param("cursor",readingCursor),owner,null,200);
        assertNotEquals(page.path("data").get(0).path("id").asText(),next.path("data").get(0).path("id").asText());
        assertTrue(next.path("meta").path("nextCursor").isNull());
        call(get("/api/v1/library/"+secondEntry+"/experiences").param("cursor",readingCursor),owner,null,400);
        note(first,"NOTE","One");note(first,"QUOTE","Two");
        var journals=call(get("/api/v1/experiences/"+first+"/journal").param("limit","1"),owner,null,200);
        String journalCursor=journals.path("meta").path("nextCursor").asText();
        var journalNext=call(get("/api/v1/experiences/"+first+"/journal").param("limit","1").param("cursor",journalCursor),owner,null,200);
        assertNotEquals(journals.path("data").get(0).path("id").asText(),journalNext.path("data").get(0).path("id").asText());
        call(get("/api/v1/experiences/"+second+"/journal").param("cursor",journalCursor),owner,null,400);
    }

    @Test void databaseConstraintsRejectInvalidScoresStatusesProgressAndMismatchedWork()throws Exception{
        String entry=entry();UUID work=db.queryForObject("SELECT work_id FROM app.library_entries WHERE id=?",UUID.class,UUID.fromString(entry));
        for(String statement:List.of(
            "INSERT INTO app.reading_experiences(id,library_entry_id,work_id,status,rating) VALUES (?,?,?,'FINISHED',4.2)",
            "INSERT INTO app.reading_experiences(id,library_entry_id,work_id,status,progress_percent) VALUES (?,?,?,'FINISHED',101)",
            "INSERT INTO app.reading_experiences(id,library_entry_id,work_id,status) VALUES (?,?,?,'WANT_TO_READ')"))
            assertThrows(DataIntegrityViolationException.class,()->db.update(statement,UUID.randomUUID(),UUID.fromString(entry),work));
        assertThrows(DataIntegrityViolationException.class,()->db.update(
            "INSERT INTO app.reading_experiences(id,library_entry_id,work_id,status) VALUES (?,?,?,'FINISHED')",
            UUID.randomUUID(),UUID.fromString(entry),UUID.randomUUID()));
        String reading=experience(entry,"{\"status\":\"CURRENTLY_READING\"}");
        assertThrows(DataIntegrityViolationException.class,()->db.update(
            "INSERT INTO app.reading_experiences(id,library_entry_id,work_id,status) VALUES (?,?,?,'PAUSED')",
            UUID.randomUUID(),UUID.fromString(entry),work));
        UUID journal=UUID.randomUUID();db.update("INSERT INTO app.journal_entries(id,experience_id,kind,body) VALUES (?,?,'NOTE','Private by default')",
            journal,UUID.fromString(reading));
        assertFalse(db.queryForObject("SELECT allow_for_personalization FROM app.journal_entries WHERE id=?",Boolean.class,journal));
    }

    @Test void concurrentReadingStartsCommitExactlyOneOpenExperience()throws Exception{
        String entry=entry();CountDownLatch start=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)){
            var futures=new ArrayList<java.util.concurrent.Future<Integer>>();
            for(int i=0;i<2;i++)futures.add(executor.submit(()->{
                start.await();
                try{readings.create(owner,UUID.fromString(entry),"{\"status\":\"CURRENTLY_READING\"}");return 201;}
                catch(ApiException ex){return ex.status().value();}
            }));
            start.countDown();
            List<Integer> statuses=new ArrayList<>();for(var future:futures)statuses.add(future.get());
            assertEquals(List.of(201,409),statuses.stream().sorted().toList());
        }
        assertEquals(1,db.queryForObject("SELECT count(*) FROM app.reading_experiences WHERE library_entry_id=?",Integer.class,UUID.fromString(entry)));
    }
}
