package tn.ktob.api.shared;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RequestFieldsTest {
    @Test void preservesExactDecimalAndDistinguishesNullFromOmitted(){
        var fields=RequestFields.parse("{\"rating\":4.5000000000000000001,\"startedOn\":null}",
            Set.of("rating","startedOn","finishedOn"),Set.of());
        assertEquals(new BigDecimal("4.5000000000000000001"),fields.decimal("rating"));
        assertTrue(fields.has("startedOn"));assertNull(fields.date("startedOn"));
        assertFalse(fields.has("finishedOn"));
    }

    @Test void rejectsUnknownFieldsEmptyObjectsAndWrongTypes(){
        for(String body:new String[]{"{}","[]","null","{\"readerId\":\"spoof\"}"})
            assertThrows(ApiException.class,()->RequestFields.parse(body,Set.of("rating"),Set.of()));
        var fields=RequestFields.parse("{\"favorite\":null,\"progressPercent\":2.5,\"rating\":\"4.5\",\"date\":\"2026-02-30\"}",
            Set.of("favorite","progressPercent","rating","date"),Set.of());
        assertThrows(ApiException.class,()->fields.bool("favorite"));
        assertThrows(ApiException.class,()->fields.integer("progressPercent"));
        assertThrows(ApiException.class,()->fields.decimal("rating"));
        assertThrows(ApiException.class,()->fields.date("date"));
    }

    @Test void cursorsRejectDifferentReaderResourceOrFilterScopes(){
        var id=java.util.UUID.randomUUID();
        String token=KeysetCursor.encode("reader-a:entry-1:active",id);
        assertEquals(id,KeysetCursor.decode(token,"reader-a:entry-1:active"));
        for(String other:Set.of("reader-b:entry-1:active","reader-a:entry-2:active","reader-a:entry-1:archived"))
            assertThrows(ApiException.class,()->KeysetCursor.decode(token,other));
        assertThrows(ApiException.class,()->KeysetCursor.decode("garbage","reader-a:entry-1:active"));
    }
}
