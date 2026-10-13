package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.PremiumRequestRepository;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PremiumAdAllowanceServiceTests {
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    final PremiumRequestRepository memberships = mock(PremiumRequestRepository.class);
    final PremiumAdAllowanceService service = new PremiumAdAllowanceService(jdbc, memberships);
    void active() {
        when(memberships.subscriptions(11)).thenReturn(List.of(new PremiumRequestRepository.Subscription(1,1,"Monthly",Instant.now().minusSeconds(60),Instant.now().plusSeconds(3600),"ACTIVE",true)));
    }
    void usage(int used, Instant lease) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getInt(1)).thenReturn(used);
        when(rs.getTimestamp(2)).thenReturn(lease == null ? null : Timestamp.from(lease));
        when(jdbc.queryForObject(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Object>>any(), eq(11L), any(LocalDate.class)))
            .thenAnswer(call -> call.<RowMapper<?>>getArgument(1).mapRow(rs,0));
    }
    @Test void ordinaryUsersReceiveNoAllowanceAndDoNotWriteUsage() {
        when(memberships.subscriptions(11)).thenReturn(List.of());
        assertEquals(0,service.reserve(11).remainingSeconds());
        verifyNoInteractions(jdbc);
    }
    @Test void firstVisitReservesOnlyTenSecondsFromDailyFiveMinutes() throws Exception {
        active(); usage(0,null);
        var result = service.reserve(11);
        assertEquals(300,result.remainingSeconds());
        assertTrue(result.leaseUntil().isAfter(Instant.now()));
        verify(jdbc).update(startsWith("UPDATE premium_daily_ad_usage"),eq(10),any(Timestamp.class),eq(11L),any(LocalDate.class));
    }
    @Test void anotherTabReusesExistingLeaseWithoutDoubleCharge() throws Exception {
        active(); Instant lease = Instant.now().plusSeconds(8); usage(10,lease);
        assertEquals(lease,service.reserve(11).leaseUntil());
        verify(jdbc,never()).update(startsWith("UPDATE premium_daily_ad_usage"),any(),any(),any(),any());
    }
    @Test void exhaustedAllowanceCannotBeGrantedAgain() throws Exception {
        active(); usage(300,Instant.now().minusSeconds(5));
        assertEquals(0,service.reserve(11).remainingSeconds());
    }
    @Test void vietnamDayAndLeaseRoundingAreExplicit() {
        assertEquals(LocalDate.of(2026,10,14),Instant.parse("2026-10-13T17:00:00Z").atZone(PremiumAdAllowanceService.ZONE).toLocalDate());
        assertEquals(1,PremiumAdAllowanceService.secondsLeft(Instant.EPOCH,Instant.EPOCH.plusMillis(500)));
        assertEquals(0,PremiumAdAllowanceService.secondsLeft(Instant.EPOCH,Instant.EPOCH.minusSeconds(1)));
    }
}
