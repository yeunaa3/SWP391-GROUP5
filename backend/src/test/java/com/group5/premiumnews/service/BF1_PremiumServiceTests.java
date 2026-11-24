package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.BF1_PremiumRepository;
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

class BF1_PremiumServiceTests {
    private final BF1_PremiumRepository repository = mock(BF1_PremiumRepository.class);
    private final BF1_PremiumService service = new BF1_PremiumService(repository);
    private final BF1_PremiumRepository.Plan plan = new BF1_PremiumRepository.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
    private final BF1_PremiumRepository.Request request = new BF1_PremiumRepository.Request(7, 11, plan, "PENDING");

    @BeforeEach void setup() { when(repository.lockActiveUser(11)).thenReturn(true); }

    @Test void membershipReadsActualScopedSubscriptionsNotRequestHistory() {
        var subscription = new BF1_PremiumRepository.Subscription(3, 2, "Monthly", Instant.now().minusSeconds(10), Instant.now().plusSeconds(100), "ACTIVE", true);
        when(repository.subscriptions(11)).thenReturn(java.util.List.of(subscription));
        when(repository.pending(11)).thenReturn(Optional.empty());
        var result = service.access(11);
        assertEquals(true, result.get("active"));
        assertEquals(java.util.List.of(subscription), result.get("subscriptions"));
        assertEquals(0L, result.get("pendingPackageId"));
        verify(repository, never()).list(any());
    }

    @Test void pendingAndFuturePeriodsDoNotGrantCurrentAccess() {
        var future = new BF1_PremiumRepository.Subscription(3, 2, "Monthly", Instant.now().plusSeconds(100), Instant.now().plusSeconds(200), "ACTIVE", false);
        when(repository.subscriptions(11)).thenReturn(java.util.List.of(future));
        when(repository.pending(11)).thenReturn(Optional.of(request));
        assertEquals(false, service.access(11).get("active"));
        assertEquals(2L, service.access(11).get("pendingPackageId"));
    }

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

    @Test void differentPlanAutoCancelsOldPendingAndCreatesNewRequest() {
        var plan3 = new BF1_PremiumRepository.Plan(3, "YEAR", "Yearly", new BigDecimal("790000"), "VND", 365);
        when(repository.pending(11)).thenReturn(Optional.of(request));
        when(repository.activePlan(3)).thenReturn(Optional.of(plan3));
        when(repository.create(11, plan3)).thenReturn(8L);

        var result = service.submit(11, 3);
        assertEquals(8L, result.get("id"));
        verify(repository).cancel(request.id(), "Đã tự động hủy để chuyển sang gói cước mới");
        verify(repository).create(11, plan3);
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

    @Test void rejectedRequestRequiresNonBlankNote() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.review(99, 7, false, false, "   ")).getStatusCode().value());
        verify(repository, never()).activate(any(), any(), any());
        verify(repository, never()).review(anyLong(), anyLong(), any(), any(), any());
    }

    @Test void reReviewThrowsConflict() {
        var processed = new BF1_PremiumRepository.Request(7, 11, plan, "APPROVED");
        when(repository.lockRequest(7)).thenReturn(Optional.of(processed));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.review(99, 7, true, true, "Ok")).getStatusCode().value());
    }

    @Test void inactiveUserCannotBeApproved() {
        when(repository.lockRequest(7)).thenReturn(Optional.of(request));
        when(repository.lockActiveUser(11)).thenReturn(false);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.review(99, 7, true, true, "Ok")).getStatusCode().value());
    }
}
