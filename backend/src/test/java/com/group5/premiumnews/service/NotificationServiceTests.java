package com.group5.premiumnews.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationServiceTests {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final NotificationService service=new NotificationService(jdbc);
    @Test void readStateMutationIsScopedToCurrentUserAndInAppChannel() {
        when(jdbc.update(anyString(),eq(true),eq(true),eq(17L),eq(42L))).thenReturn(1);
        service.mark(42,17,true);
        verify(jdbc).update(contains("notification_id=? AND user_id=? AND delivery_channel='IN_APP'"),eq(true),eq(true),eq(17L),eq(42L));
    }
    @Test void cannotMarkAnotherUsersNotice() {
        when(jdbc.queryForObject(anyString(),eq(Long.class),eq(17L),eq(42L))).thenReturn(0L);
        assertThrows(ResponseStatusException.class,()->service.mark(42,17,true));
    }
    @Test void markingAlreadyReadIsIdempotent() {
        when(jdbc.queryForObject(anyString(),eq(Long.class),eq(17L),eq(42L))).thenReturn(1L);
        assertDoesNotThrow(()->service.mark(42,17,true));
    }
    @Test void bulkReadNeverTouchesOtherUsersOrEmailNotices() {
        service.markAll(42);
        verify(jdbc).update(contains("WHERE user_id=? AND delivery_channel='IN_APP' AND is_read=FALSE"),eq(42L));
    }
}
