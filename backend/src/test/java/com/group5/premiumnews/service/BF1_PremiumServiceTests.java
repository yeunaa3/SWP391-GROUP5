package com.group5.premiumnews.service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BF1_PremiumServiceTests {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BF1_PremiumService service = new BF1_PremiumService(jdbc);

    @Test
    void accessReturnsTrueWhenActiveSubscriptionExists() {
        var sub = new BF1_PremiumService.Subscription(1, 2, "Monthly", Instant.now().minusSeconds(10), Instant.now().plusSeconds(100), "ACTIVE", true);
        when(jdbc.query(contains("FROM subscriptions"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of(sub));
        when(jdbc.query(contains("status='PENDING'"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of());

        var result = service.access(11L);

        assertEquals(true, result.get("active"));
        assertEquals(List.of(sub), result.get("subscriptions"));
        assertEquals(0L, result.get("pendingPackageId"));
    }

    @Test
    void accessReturnsFalseWhenNoCurrentSubscription() {
        var future = new BF1_PremiumService.Subscription(1, 2, "Monthly", Instant.now().plusSeconds(100), Instant.now().plusSeconds(200), "ACTIVE", false);
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 11, plan, "PENDING");

        when(jdbc.query(contains("FROM subscriptions"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of(future));
        when(jdbc.query(contains("status='PENDING'"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of(req));

        var result = service.access(11L);

        assertEquals(false, result.get("active"));
        assertEquals(2L, result.get("pendingPackageId"));
    }

    @Test
    void submitThrowsForbiddenWhenUserNotActive() {
        when(jdbc.queryForList(contains("WHERE user_id=? AND status='ACTIVE'"), eq(Long.class), eq(11L)))
                .thenReturn(List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.submit(11L, 2L));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void submitThrowsNotFoundWhenPlanNotActive() {
        when(jdbc.queryForList(contains("WHERE user_id=? AND status='ACTIVE'"), eq(Long.class), eq(11L)))
                .thenReturn(List.of(11L));
        when(jdbc.query(contains("WHERE user_id=? AND status='PENDING'"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of());
        when(jdbc.query(contains("SELECT * FROM subscription_packages WHERE package_id=? AND status='ACTIVE'"), any(RowMapper.class), eq(2L)))
                .thenReturn(List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.submit(11L, 2L));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void submitReturnsExistingPendingWhenSamePackage() {
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 11, plan, "PENDING");

        when(jdbc.queryForList(contains("WHERE user_id=? AND status='ACTIVE'"), eq(Long.class), eq(11L)))
                .thenReturn(List.of(11L));
        when(jdbc.query(contains("WHERE user_id=? AND status='PENDING'"), any(RowMapper.class), eq(11L)))
                .thenReturn(List.of(req));

        var result = service.submit(11L, 2L);
        assertEquals(7L, result.get("id"));
        assertEquals("PENDING", result.get("status"));
    }

    @Test
    void cancelThrowsNotFoundWhenRequestDoesNotExist() {
        when(jdbc.query(contains("WHERE request_id=? FOR UPDATE"), any(RowMapper.class), eq(999L)))
                .thenReturn(List.of());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.cancel(11L, 999L));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void cancelThrowsForbiddenWhenNotOwner() {
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 99L, plan, "PENDING");

        when(jdbc.query(contains("WHERE request_id=? FOR UPDATE"), any(RowMapper.class), eq(7L)))
                .thenReturn(List.of(req));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.cancel(11L, 7L));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void cancelSucceedsWhenOwnerAndPending() {
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 11L, plan, "PENDING");

        when(jdbc.query(contains("WHERE request_id=? FOR UPDATE"), any(RowMapper.class), eq(7L)))
                .thenReturn(List.of(req));

        var result = service.cancel(11L, 7L);
        assertEquals(true, result.get("success"));
        verify(jdbc).update(contains("UPDATE premium_requests"), anyString(), eq(7L));
    }

    @Test
    void reviewRequiresPaymentConfirmationForApproval() {
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 11L, plan, "PENDING");

        when(jdbc.query(contains("WHERE request_id=? FOR UPDATE"), any(RowMapper.class), eq(7L)))
                .thenReturn(List.of(req));
        when(jdbc.queryForList(contains("WHERE user_id=? AND status='ACTIVE'"), eq(Long.class), eq(11L)))
                .thenReturn(List.of(11L));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.review(99L, 7L, true, false, ""));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void reviewRequiresNonBlankNoteForRejection() {
        var plan = new BF1_PremiumService.Plan(2, "MONTH", "Monthly", new BigDecimal("79000"), "VND", 30);
        var req = new BF1_PremiumService.Request(7, 11L, plan, "PENDING");

        when(jdbc.query(contains("WHERE request_id=? FOR UPDATE"), any(RowMapper.class), eq(7L)))
                .thenReturn(List.of(req));
        when(jdbc.queryForList(contains("WHERE user_id=? AND status='ACTIVE'"), eq(Long.class), eq(11L)))
                .thenReturn(List.of(11L));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.review(99L, 7L, false, false, "   "));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void deletePackagePerformsHardDeleteWhenUnused() {
        when(jdbc.queryForList(contains("SELECT status FROM subscription_packages"), eq(String.class), eq(55L)))
                .thenReturn(List.of("INACTIVE"));
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM subscriptions"), eq(Integer.class), eq(55L)))
                .thenReturn(0);
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM premium_requests"), eq(Integer.class), eq(55L)))
                .thenReturn(0);

        var result = service.deletePackage(55L);

        assertEquals("HARD_DELETE", result.get("mode"));
        verify(jdbc).update(contains("DELETE FROM subscription_packages"), eq(55L));
    }

    @Test
    void deletePackagePerformsSoftDeleteWhenHasSubscribers() {
        when(jdbc.queryForList(contains("SELECT status FROM subscription_packages"), eq(String.class), eq(1L)))
                .thenReturn(List.of("ACTIVE"));
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM subscriptions"), eq(Integer.class), eq(1L)))
                .thenReturn(10);
        when(jdbc.queryForObject(contains("SELECT COUNT(*) FROM premium_requests"), eq(Integer.class), eq(1L)))
                .thenReturn(5);

        var result = service.deletePackage(1L);

        assertEquals("SOFT_DELETE", result.get("mode"));
        verify(jdbc).update(contains("UPDATE subscription_packages SET status = 'INACTIVE'"), eq(1L));
    }
}
