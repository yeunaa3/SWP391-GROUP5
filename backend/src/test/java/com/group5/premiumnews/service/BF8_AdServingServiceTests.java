package com.group5.premiumnews.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BF8_AdServingServiceTests {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BF8_AdServingService service = new BF8_AdServingService(jdbc);

    @Test
    void recordEventReturnsTargetUrlAndInsertsEventWhenValid() {
        when(jdbc.queryForList(anyString(), eq(10L))).thenReturn(List.of(Map.of(
                "target_url", "https://example.com/promo",
                "campaign_id", 100L,
                "slot_id", 5L,
                "contract_id", 50L
        )));
        when(jdbc.queryForObject(anyString(), eq(Long.class), anyString(), eq("CLICK"))).thenReturn(0L);

        String result = service.recordEvent(10L, "CLICK", "session-123");

        assertEquals("https://example.com/promo", result);
        verify(jdbc).update(contains("INSERT INTO ad_events"), eq("CLICK"), eq(100L), eq(10L), eq(5L), anyString());
        verify(jdbc).update(contains("INSERT INTO ad_metrics"), eq(10L), eq(0), eq(1));
    }

    @Test
    void recordEventDetectsRapidClickFraudAndMarksInvalid() {
        when(jdbc.queryForList(anyString(), eq(10L))).thenReturn(List.of(Map.of(
                "target_url", "https://example.com/promo",
                "campaign_id", 100L,
                "slot_id", 5L,
                "contract_id", 50L
        )));
        // Simulate existing click in the 2s time window
        when(jdbc.queryForObject(anyString(), eq(Long.class), anyString(), eq("CLICK"))).thenReturn(1L);

        String result = service.recordEvent(10L, "CLICK", "session-123");

        assertEquals("https://example.com/promo", result);
        // Must insert fraud event with RAPID_CLICK_DUPLICATE
        verify(jdbc).update(contains("RAPID_CLICK_DUPLICATE"), eq(100L), eq(10L), eq(5L), anyString());
        // Must update invalid_clicks_count in ad_metrics
        verify(jdbc).update(contains("invalid_clicks_count"), eq(10L));
    }

    @Test
    void recordEventReturnsSlashWhenCreativeNotFound() {
        when(jdbc.queryForList(anyString(), anyLong())).thenReturn(List.of());

        String result = service.recordEvent(999L, "CLICK", "session-xyz");

        assertEquals("/", result);
        verify(jdbc, never()).update(contains("INSERT INTO ad_events"), any(Object[].class));
    }

    @Test
    void bannersReturnsDefaultIfNoSpecificMatches() {
        when(jdbc.queryForList(anyString(), any(), any(), any(), any(), any())).thenReturn(List.of());
        when(jdbc.queryForList(anyString(), eq("HOME_HERO"))).thenReturn(List.of(Map.of(
                "id", 1L,
                "title", "Default Banner",
                "mediaUrl", "/ad.png",
                "position", "HOME_HERO"
        )));

        var result = service.banners("HOME_HERO");

        assertEquals(1, result.size());
        assertEquals("Default Banner", result.get(0).get("title"));
    }
}
