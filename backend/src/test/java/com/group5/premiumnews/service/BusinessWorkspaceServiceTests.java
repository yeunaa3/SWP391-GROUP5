package com.group5.premiumnews.service;

import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.time.LocalDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BusinessWorkspaceServiceTests {
    @Test void supportsBothMySqlDateTimeRepresentations() {
        var date=LocalDateTime.of(2026,10,7,8,30);
        assertEquals(date,BusinessWorkspaceService.dateTime(date));
        assertEquals(date,BusinessWorkspaceService.dateTime(java.sql.Timestamp.valueOf(date)));
    }
    private final AuthenticatedUserPrincipal user=new AuthenticatedUserPrincipal(1L,"test","test@example.local","unused","Test",999L,true,List.of(new SimpleGrantedAuthority("ROLE_BUSINESS")));
    @Test void membershipUsesFreshDatabaseValueRatherThanSessionCompany() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        assertEquals(4L,new BusinessWorkspaceService(jdbc).companyId(user));
    }
    @Test void newAccountReturnsEmptyWorkspaceNotOtherCompanyData() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        var result=new BusinessWorkspaceService(jdbc).overview(user);
        assertEquals(List.of(),result.get("campaigns"));assertEquals(List.of(),result.get("contracts"));
        verify(jdbc).queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L);
        verifyNoMoreInteractions(jdbc);
    }
    @Test void campaignMustRemainWithinContractWindow() {
        var start=LocalDateTime.now().plusDays(1);var end=start.plusDays(30);
        assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.validateCampaignDates(start.minusHours(1),start.plusDays(2),start,end));
        assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.validateCampaignDates(start,end.plusHours(1),start,end));
        assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.validateCampaignDates(start,start,start,end));
        assertDoesNotThrow(()->BusinessWorkspaceService.validateCampaignDates(start,start.plusDays(1),start,end));
    }
    @Test void submittedCampaignCannotBeEdited() {
        var service=new BusinessWorkspaceService(mock(JdbcTemplate.class));
        assertThrows(InvalidStateTransitionException.class,()->service.requireEditable(java.util.Map.of("status","PENDING_REVIEW")));
        assertThrows(InvalidStateTransitionException.class,()->service.requireEditable(java.util.Map.of("status","ACTIVE")));
        assertDoesNotThrow(()->service.requireEditable(java.util.Map.of("status","DRAFT")));
    }
    @Test void draftBookingIsSubmittedWithoutPaymentOrReservation() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        var start=LocalDateTime.now().plusDays(2);
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        when(jdbc.queryForList("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(List.of(java.util.Map.of("application_status","APPROVED")));
        when(jdbc.queryForList("SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",8L,4L)).thenReturn(List.of(java.util.Map.of("status","DRAFT","start_at",start,"end_at",start.plusDays(3),"slot_id",2L,"b2b_package_id",3L)));
        when(jdbc.queryForList("SELECT * FROM ad_slots WHERE slot_id=? AND status='ACTIVE' FOR UPDATE",2L)).thenReturn(List.of(java.util.Map.of("slot_id",2L)));
        when(jdbc.queryForList("SELECT * FROM b2b_packages WHERE b2b_package_id=? AND status='ACTIVE'",3L)).thenReturn(List.of(java.util.Map.of("b2b_package_id",3L)));
        assertEquals("PENDING_REVIEW",new BusinessWorkspaceService(jdbc).submitBooking(user,8L).get("status"));
        verify(jdbc).update("UPDATE contracts SET status='PENDING_REVIEW' WHERE contract_id=?",8L);
        verify(jdbc).update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)",1L,"SUBMIT_BOOKING_REQUEST","CONTRACT","8");
    }
    @Test void bookingFromAnotherCompanyCannotBeSubmitted() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        when(jdbc.queryForList("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(List.of(java.util.Map.of("application_status","APPROVED")));
        assertThrows(InvalidStateTransitionException.class,()->new BusinessWorkspaceService(jdbc).submitBooking(user,8L));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void submittedBookingCannotBeSubmittedAgain() {
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        when(jdbc.queryForList("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(List.of(java.util.Map.of("application_status","APPROVED")));
        when(jdbc.queryForList("SELECT * FROM contracts WHERE contract_id=? AND company_id=? FOR UPDATE",8L,4L)).thenReturn(List.of(java.util.Map.of("status","PENDING_REVIEW")));
        assertThrows(InvalidStateTransitionException.class,()->new BusinessWorkspaceService(jdbc).submitBooking(user,8L));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
