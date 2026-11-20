package tn.ktob.api.shared;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApiPrimitivesTest {

    @Test
    void validatesPageSizeAndOpaqueCursorShape() {
        assertEquals(25, PageWindow.of(null, null).limit());
        assertEquals(100, PageWindow.of(100, "a_b-c").limit());
        assertEquals("a_b-c", PageWindow.of(100, "a_b-c").cursor());
        assertEquals("INVALID_PAGINATION",
            assertThrows(ApiException.class, () -> PageWindow.of(0, null)).code());
        assertEquals("INVALID_PAGINATION",
            assertThrows(ApiException.class, () -> PageWindow.of(101, null)).code());
        assertEquals("INVALID_CURSOR",
            assertThrows(ApiException.class, () -> PageWindow.of(1, " ")).code());
        assertEquals("INVALID_CURSOR",
            assertThrows(ApiException.class, () -> PageWindow.of(1, "bad\ncontrol")).code());
    }

    @Test
    void parsesOnlyFullUuidIdentifiers() {
        String good = "8e23d2c1-5d13-442d-aefd-8e8a019996d5";
        assertEquals(UUID.fromString(good), UuidValue.parse(good));
        assertEquals("INVALID_UUID",
            assertThrows(ApiException.class, () -> UuidValue.parse("1-1-1-1-1")).code());
        assertEquals("INVALID_UUID",
            assertThrows(ApiException.class, () -> UuidValue.parse("../secrets")).code());
    }

    @Test
    void pageAndDataEnvelopesAreImmutableValueObjects() {
        ApiPage<String> page = new ApiPage<>(List.of("book"), new PageMeta(null));
        assertEquals(List.of("book"), page.data());
        assertThrows(UnsupportedOperationException.class, () -> page.data().add("another"));
        assertEquals("book", new ApiData<>("book").data());
    }
}
