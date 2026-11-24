package tn.ktob.advisor;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import tn.ktob.api.shared.ApiException;

class ConversationPolicyTest {
    @Test void spoilersAreExplicitPerRequestAndDefaultsNeverCarryOver() {
        var ordinary=MessageRequest.parse("{\"body\":\"Discuss the narrator\"}");
        assertEquals(SpoilerLevel.NO_SPOILERS,ordinary.spoilerLevel());
        assertFalse(ordinary.fullBookSpoilersConfirmed());
        for(String body:List.of(
            "{\"body\":\"Question\",\"spoilerLevel\":\"FULL_BOOK_SPOILERS\"}",
            "{\"body\":\"Question\",\"fullBookSpoilersConfirmed\":true}",
            "{\"body\":\"Question\",\"spoilerLevel\":\"NO_SPOILERS\",\"fullBookSpoilersConfirmed\":true}")) {
            ApiException ex=assertThrows(ApiException.class,()->MessageRequest.parse(body));
            assertEquals("SPOILER_CONFIRMATION_REQUIRED",ex.code());
        }
        assertEquals(SpoilerLevel.FULL_BOOK_SPOILERS,MessageRequest.parse(
            "{\"body\":\"Question\",\"spoilerLevel\":\"FULL_BOOK_SPOILERS\",\"fullBookSpoilersConfirmed\":true}").spoilerLevel());
        assertEquals(SpoilerLevel.NO_SPOILERS,MessageRequest.parse("{\"body\":\"Next question\"}").spoilerLevel());
    }

    @Test void excludesBothSidesOfFullSpoilerHistoryAndRetainsCompleteSafePairs() {
        var history=List.of(
            new ConversationRepository.PriorTurn("PRIVATE FULL QUESTION","SECRET ENDING",SpoilerLevel.FULL_BOOK_SPOILERS),
            new ConversationRepository.PriorTurn("Safe question","Safe answer",SpoilerLevel.NO_SPOILERS));
        var context=ConversationContextBuilder.build(null,MessageRequest.parse("{\"body\":\"Continue safely\"}"),history);
        assertEquals(List.of("system","user","assistant","user"),context.stream().map(LiteraryAiPort.PromptMessage::role).toList());
        assertEquals("Safe question",context.get(1).content());
        assertEquals("Safe answer",context.get(2).content());
        assertFalse(context.toString().contains("PRIVATE FULL"));
        assertFalse(context.toString().contains("SECRET ENDING"));
    }

    @Test void enforcesUtf8BudgetAndDoesNotTruncateSubmittedQuestionOrSplitPairs() {
        var history=List.of(new ConversationRepository.PriorTurn("x".repeat(5000),"y".repeat(5000),SpoilerLevel.NO_SPOILERS));
        var request=MessageRequest.parse("{\"body\":\"اشرح الرمز الأدبي\"}");
        var context=ConversationContextBuilder.build(null,request,history);
        assertEquals(2,context.size());
        assertEquals(request.body(),context.getLast().content());
        assertTrue(context.stream().mapToInt(m->m.content().getBytes(StandardCharsets.UTF_8).length).sum()<=6000);
        ApiException error=assertThrows(ApiException.class,()->ConversationContextBuilder.build(null,
            new MessageRequest("ع".repeat(4000),SpoilerLevel.NO_SPOILERS,false),List.of()));
        assertEquals("AI_CONTEXT_TOO_LARGE",error.code());
    }

    @Test void strictFieldsAndCanonicalIdempotencyDoNotAllowImplicitPersonalization() {
        for(String body:List.of("{}","{\"body\":\" \"}","{\"body\":null}",
            "{\"body\":\"Question\",\"usePersonalContext\":true}",
            "{\"body\":\"Question\",\"spoilerLevel\":null}",
            "{\"body\":\"Question\",\"fullBookSpoilersConfirmed\":null}"))
            assertThrows(ApiException.class,()->MessageRequest.parse(body));
        String first=MessageRequest.parse("{\"body\":\"Question\"}").fingerprint();
        String second=MessageRequest.parse("{\"fullBookSpoilersConfirmed\":false,\"body\":\"Question\",\"spoilerLevel\":\"NO_SPOILERS\"}").fingerprint();
        assertEquals(first,second);
        assertNotEquals(first,MessageRequest.parse("{\"body\":\"Question!\"}").fingerprint());
    }
}
