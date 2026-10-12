package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.PremiumRequestRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ManualPremiumServiceTests {
    private final PremiumRequestRepository repository = mock(PremiumRequestRepository.class);
    private final ManualPremiumService service = new ManualPremiumService(repository);
    private final PremiumRequestRepository.Plan plan = new PremiumRequestRepository.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
    private final PremiumRequestRepository.Request request = new PremiumRequestRepository.Request(7, 11, plan, "PENDING");

    @BeforeEach void setup() { when(repository.lockActiveUser(11)).thenReturn(true); }

    @Test void submittingUsesCatalogSnapshotAndDoesNotActivate() {
        when(repository.pending(11)).thenReturn(Optional.empty());
        when(repository.activePlan(2)).thenReturn(Optional.of(plan));
        when(repository.create(11, plan)).thenReturn(7L);
        assertEquals(7L, service.submit(11, 2).get("id"));
        verify(repository).create(11, plan);
        verify(repository, never()).activate(any(), any(), any());
    }

    @Test void doubleSubmitReturnsSamePendingRequest() {
        when(repository.pending(11)).thenReturn(Optional.of(request));
        assertEquals(7L, service.submit(11, 2).get("id"));
        verify(repository, never()).create(anyLong(), any());
    }

    @Test void differentPlanCannotBypassPendingRequest() {
        when(repository.pending(11)).thenReturn(Optional.of(request));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.submit(11, 3)).getStatusCode().value());
    }

    @Test void unavailablePlanDoesNotCreateRequest() {
        when(repository.pending(11)).thenReturn(Optional.empty());
        when(repository.activePlan(2)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.submit(11, 2)).getStatusCode().value());
        verify(repository, never()).create(anyLong(), any());
    }

    @Test void approvalRequiresExplicitPaymentConfirmation() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.review(99, 7, true, false, "")).getStatusCode().value());
        verify(repository, never()).activate(any(), any(), any());
    }

    @Test void activePeriodIsExtendedWithoutLosingDays() {
        Instant end = Instant.now().plus(10, ChronoUnit.DAYS);
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        when(repository.latestExpiry(11)).thenReturn(end);
        when(repository.activate(request, end, end.plus(30, ChronoUnit.DAYS))).thenReturn(50L);
        service.review(99, 7, true, true, "Bank checked");
        verify(repository).activate(request, end, end.plus(30, ChronoUnit.DAYS));
        verify(repository).review(7, 99, "APPROVED", "Bank checked", 50L);
    }

    @Test void expiredPeriodStartsAtApprovalNotSubmission() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        when(repository.latestExpiry(11)).thenReturn(Instant.now().minus(2, ChronoUnit.DAYS));
        Instant before = Instant.now();
        service.review(99, 7, true, true, "Checked");
        var start = ArgumentCaptor.forClass(Instant.class); var end = ArgumentCaptor.forClass(Instant.class);
        verify(repository).activate(eq(request), start.capture(), end.capture());
        assertFalse(start.getValue().isBefore(before));
        assertEquals(start.getValue().plus(30, ChronoUnit.DAYS), end.getValue());
    }

    @Test void processedRequestCannotBeGrantedTwice() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(new PremiumRequestRepository.Request(7, 11, plan, "APPROVED")));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.review(99, 7, true, true, "")).getStatusCode().value());
        verify(repository, never()).activate(any(), any(), any());
    }

    @Test void rejectionRequiresReasonAndNeverGrantsAccess() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        assertThrows(ResponseStatusException.class, () -> service.review(99, 7, false, false, " "));
        service.review(99, 7, false, false, "No matching payment");
        verify(repository).review(7, 99, "REJECTED", "No matching payment", null);
        verify(repository, never()).activate(any(), any(), any());
    }

    @Test void readerListIsScopedToCurrentAccount() { service.list(11L); verify(repository).list(11L); }
}
