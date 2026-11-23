package tn.ktob.reading;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tn.ktob.api.shared.ApiException;

class ReadingValidationTest {
    private ReadingExperience reading(BigDecimal rating,Integer progress,LocalDate start,LocalDate finish){
        return new ReadingExperience(UUID.randomUUID(),UUID.randomUUID(),null,
            ReadingStatus.FINISHED,start,finish,rating,progress);
    }

    @Test void everyHalfStarIsAllowedWithoutRequiringProgress(){
        assertDoesNotThrow(()->ReadingService.validate(reading(null,null,null,null)));
        for(int half=2;half<=10;half++){
            BigDecimal rating=BigDecimal.valueOf(half).divide(BigDecimal.valueOf(2));
            assertDoesNotThrow(()->ReadingService.validate(reading(rating,null,null,null)));
        }
    }

    @Test void rejectsNonHalfStarsOutOfRangeProgressAndReversedDates(){
        for(String bad:new String[]{"0","0.5","1.1","4.49","5.5","4.5000000000000000001"})
            assertThrows(ApiException.class,()->ReadingService.validate(reading(new BigDecimal(bad),null,null,null)));
        assertThrows(ApiException.class,()->ReadingService.validate(reading(null,101,null,null)));
        assertThrows(ApiException.class,()->ReadingService.validate(reading(null,-1,null,null)));
        assertThrows(ApiException.class,()->ReadingService.validate(reading(null,null,
            LocalDate.of(2026,11,24),LocalDate.of(2026,11,23))));
    }
}
