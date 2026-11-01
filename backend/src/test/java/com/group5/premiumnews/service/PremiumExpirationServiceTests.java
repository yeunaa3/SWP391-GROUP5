package com.group5.premiumnews.service;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class PremiumExpirationServiceTests {
    @Test void noOverdueSubscriptionDoesNotRevokeOrNotify(){
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForList(anyString(),eq(7L))).thenReturn(List.of());
        assertEquals(0,new PremiumExpirationService(jdbc).expireUser(7L));verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void overlappingActiveSubscriptionKeepsSubscriberRole(){
        var jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForList(contains("SELECT subscription_id"),eq(7L))).thenReturn(List.of(Map.of("subscription_id",8L,"package_name_snapshot","QA")));
        when(jdbc.queryForObject(contains("SELECT COUNT(*)"),eq(Integer.class),eq(7L))).thenReturn(1);
        assertEquals(1,new PremiumExpirationService(jdbc).expireUser(7L));
        verify(jdbc,never()).update(contains("DELETE ur"),eq(7L));
        verify(jdbc).update(contains("EXPIRE_SUBSCRIPTION"),eq("8"));
    }
    @Test void schedulerContinuesAfterOneUsersFailure(){
        var jdbc=mock(JdbcTemplate.class);var worker=mock(PremiumExpirationService.class);
        when(jdbc.queryForList(anyString(),eq(Long.class))).thenReturn(List.of(1L,2L));when(worker.expireUser(1L)).thenThrow(new IllegalStateException("QA storage failure"));when(worker.expireUser(2L)).thenReturn(1);
        assertEquals(1,new PremiumSubscriptionScheduler(jdbc,worker).expireOverdueSubscriptions());verify(worker).expireUser(2L);
    }
}
