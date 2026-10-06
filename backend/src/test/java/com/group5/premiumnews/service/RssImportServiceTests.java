package com.group5.premiumnews.service;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class RssImportServiceTests {
    @Test void stripsFeedHtmlAndScripts() {
        assertEquals("Tin & dữ liệu", RssImportService.plain("<img src='x'><a>Tin &amp; dữ liệu</a><script>bad()</script>"));
    }
    @Test void parsesVnExpressTimezone() {
        assertEquals(Instant.parse("2026-10-06T04:24:43Z"), RssImportService.parseDate("Tue, 06 Oct 2026 11:24:43 +0700"));
    }
    @Test void parsesTuoiTreVietnamTimeAndNarrowSpace() {
        assertEquals(Instant.parse("2026-10-06T10:34:00Z"), RssImportService.parseDate("10/6/2026 5:34:00\u202fPM"));
    }
}
