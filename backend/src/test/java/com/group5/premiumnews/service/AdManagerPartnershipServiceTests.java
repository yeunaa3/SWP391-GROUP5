package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.AdManagerDtos;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

class AdManagerPartnershipServiceTests {
    @Test
    void rejectsInvalidQueueFiltersBeforeQueryingDatabase() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AdManagerPartnershipService service = new AdManagerPartnershipService(jdbc, "storage/test");

        assertBadRequest(service, new AdManagerDtos.QueueFilter("", "APPROVED", "", null, null, 0, 20));
        assertBadRequest(service, new AdManagerDtos.QueueFilter("", "", "LOW", null, null, 0, 20));
        assertBadRequest(service, new AdManagerDtos.QueueFilter("", "", "", null, null, -1, 20));
        assertBadRequest(service, new AdManagerDtos.QueueFilter("", "", "", null, null, 0, 101));
        assertBadRequest(service, new AdManagerDtos.QueueFilter("", "", "",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 14), 0, 20));

        verifyNoInteractions(jdbc);
    }

    @Test
    void blocksStaleAndDuplicateDecisions() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AdManagerPartnershipService service = new AdManagerPartnershipService(jdbc, "storage/test");

        when(jdbc.queryForList(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(12L)))
                .thenReturn(List.of(Map.of(
                        "company_id", 12L,
                        "application_version", 2,
                        "application_status", "PENDING_REVIEW")));
        assertThrows(ConflictException.class, () -> service.decide(12, null,
                new AdManagerDtos.DecisionRequest(1, "APPROVED", "")));

        when(jdbc.queryForList(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(13L)))
                .thenReturn(List.of(Map.of(
                        "company_id", 13L,
                        "application_version", 1,
                        "application_status", "APPROVED")));
        assertThrows(InvalidStateTransitionException.class, () -> service.decide(13, null,
                new AdManagerDtos.DecisionRequest(1, "APPROVED", "")));
    }

    private void assertBadRequest(AdManagerPartnershipService service, AdManagerDtos.QueueFilter filter) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.queue(filter));
        assertEquals(400, error.getStatusCode().value());
    }
}
