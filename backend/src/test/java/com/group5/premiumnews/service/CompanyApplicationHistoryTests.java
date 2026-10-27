package com.group5.premiumnews.service;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompanyApplicationHistoryTests {
    private Map<String,Object> version(int number) {
        return Map.of("application_version",number,"submitted_at","2026-10-01 09:00:00","company_name","Company version "+number);
    }
    private Map<String,Object> review(int number,String decision) {
        return Map.of("application_version",number,"decision",decision,"created_at","2026-10-02 09:00:00","review_note","Lý do "+decision,"reviewer_name","Manager");
    }
    @Test void rejectedVersionSurvivesNewDraftAndNewSubmission() {
        for(String current:List.of("DRAFT","PENDING_REVIEW","APPROVED")) {
            var history=CompanyApplicationHistory.assemble(Map.of("application_version",2,"application_status",current),
                List.of(version(2),version(1)),List.of(review(1,"REJECTED")),List.of());
            assertEquals("REJECTED",history.get(1).get("history_status"));
            @SuppressWarnings("unchecked") var events=(List<Map<String,Object>>)history.get(1).get("history_events");
            assertEquals("Lý do REJECTED",events.get(1).get("note"));
            assertEquals("Manager",events.get(1).get("reviewer_name"));
        }
    }
    @Test void resubmissionIsKeptEvenAfterLaterReviewAndRoundReset() {
        var history=CompanyApplicationHistory.assemble(Map.of("application_version",3,"application_status","DRAFT"),
            List.of(version(2),version(1)),List.of(review(1,"NEEDS_REVISION"),review(2,"APPROVED")),
            List.of(Map.of("application_version","2","submission_status","RESUBMITTED","application_code","APP-OLD")));
        assertEquals("RESUBMITTED",history.getFirst().get("submission_status"));
        assertEquals("APPROVED",history.getFirst().get("history_status"));
        assertEquals("APP-OLD",history.getFirst().get("application_code"));
        assertEquals("NEEDS_REVISION",history.get(1).get("history_status"));
    }
    @Test void internalNoteDoesNotBecomeBusinessDecisionAndSnapshotIsUnchanged() {
        var original=version(1);
        var history=CompanyApplicationHistory.assemble(Map.of("application_version",1,"application_status","PENDING_REVIEW"),
            List.of(original),List.of(review(1,"NOTE")),List.of());
        assertEquals("PENDING_REVIEW",history.getFirst().get("history_status"));
        assertFalse(original.containsKey("history_status"));
        assertEquals(1,((List<?>)history.getFirst().get("history_events")).size());
    }
    @Test void legacyVersionWithNoEvidenceIsNotAssignedCurrentCompanyStatus() {
        var history=CompanyApplicationHistory.assemble(Map.of("application_version",3,"application_status","REJECTED"),
            List.of(version(2)),List.of(),List.of());
        assertEquals("SUBMITTED",history.getFirst().get("history_status"));
        var first=CompanyApplicationHistory.assemble(Map.of("application_version",1,"application_status","REJECTED"),
            List.of(version(1)),List.of(),List.of());
        assertEquals("SUBMITTED",first.getFirst().get("history_status"));
    }
    @Test void oldResubmissionCanBeRecoveredFromPreviousVersionDecision() {
        var history=CompanyApplicationHistory.assemble(Map.of("application_version",3,"application_status","DRAFT"),
            List.of(version(2),version(1)),List.of(review(1,"NEEDS_REVISION"),review(2,"REJECTED")),List.of());
        assertEquals("RESUBMITTED",history.getFirst().get("submission_status"));
        assertEquals("REJECTED",history.getFirst().get("history_status"));
    }
    @Test void newBusinessDoesNotQueryOtherCompanyHistory() {
        var jdbc=mock(JdbcTemplate.class);
        assertTrue(CompanyApplicationHistory.load(jdbc,Map.of()).isEmpty());
        verifyNoInteractions(jdbc);
    }
    @Test void submitStoresVersionAndSubmissionStatusInExistingAuditJson() {
        var jdbc=mock(JdbcTemplate.class);
        var user=new AuthenticatedUserPrincipal(1L,"qa","qa@example.com","hash","QA",null,true,List.of(new SimpleGrantedAuthority("ROLE_BUSINESS")));
        var company=new HashMap<String,Object>();
        company.put("application_status","NEEDS_REVISION");company.put("application_version",1);
        for(String key:List.of("company_name","tax_code","email","phone","address","billing_address","industry","contact_person"))company.put(key,"test");
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        when(jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(company);
        when(jdbc.queryForObject("SELECT COUNT(*) FROM company_documents WHERE company_id=? AND status='ACTIVE'",Integer.class,4L)).thenReturn(1);
        new BusinessWorkspaceService(jdbc).submitApplication(user);
        verify(jdbc).update(contains("JSON_OBJECT('application_version'"),eq(1L),eq("SUBMIT_APPLICATION"),eq("COMPANY"),eq("4"),eq(4L));
    }
}
