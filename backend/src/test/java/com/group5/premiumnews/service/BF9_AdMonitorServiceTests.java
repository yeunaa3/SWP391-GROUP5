package com.group5.premiumnews.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BF9_AdMonitorServiceTests {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BF9_AdMonitorService service = new BF9_AdMonitorService(jdbc);

    @Test
    void toggleCampaignStatusFromActiveToPaused() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(55L))).thenReturn(List.of("ACTIVE"));

        Map<String, Object> result = service.toggleCampaignStatus(55L);

        assertEquals(55L, result.get("campaignId"));
        assertEquals("PAUSED", result.get("status"));
        verify(jdbc).update(anyString(), eq("PAUSED"), eq(55L));
    }

    @Test
    void toggleCampaignStatusFromPausedToActive() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(55L))).thenReturn(List.of("PAUSED"));

        Map<String, Object> result = service.toggleCampaignStatus(55L);

        assertEquals(55L, result.get("campaignId"));
        assertEquals("ACTIVE", result.get("status"));
        verify(jdbc).update(anyString(), eq("ACTIVE"), eq(55L));
    }

    @Test
    void toggleCampaignStatusThrowsWhenNotFound() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(999L))).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class, () -> service.toggleCampaignStatus(999L));
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void toggleCampaignStatusThrowsWhenStatusNotActiveOrPaused() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(55L))).thenReturn(List.of("COMPLETED"));

        assertThrows(IllegalStateException.class, () -> service.toggleCampaignStatus(55L));
        verify(jdbc, never()).update(anyString(), any(), any());
    }
}
