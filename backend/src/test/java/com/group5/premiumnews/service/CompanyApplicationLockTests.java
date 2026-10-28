package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.BusinessRequests;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.mock.web.MockMultipartFile;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompanyApplicationLockTests {
    private final AuthenticatedUserPrincipal user=new AuthenticatedUserPrincipal(1L,"test","test@example.com","unused","Test",4L,true,List.of(new SimpleGrantedAuthority("ROLE_BUSINESS")));

    @Test void submittedAndReviewedProfilesCannotBeUpdated() {
        for(String state:List.of("PENDING_REVIEW","RESUBMITTED","APPROVED","REJECTED")) {
            var jdbc=mock(JdbcTemplate.class);
            when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? FOR UPDATE",Long.class,1L)).thenReturn(4L);
            when(jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(Map.of("application_status",state));
            var request=new BusinessRequests.Company("Company","0312345678","qa@example.com","0901234567","Address","Billing","Industry","Contact");
            assertThrows(InvalidStateTransitionException.class,()->new BusinessWorkspaceService(jdbc).saveCompany(user,request),state);
            verify(jdbc,never()).update(anyString(),any(Object[].class));
        }
    }

    @Test void submittedAndReviewedDocumentsCannotBeReplaced() {
        for(String state:List.of("PENDING_REVIEW","RESUBMITTED","APPROVED","REJECTED")) {
            var jdbc=mock(JdbcTemplate.class);var business=mock(BusinessWorkspaceService.class);var storage=mock(BusinessAssetStorage.class);
            when(business.requireCompany(user)).thenReturn(4L);
            when(jdbc.queryForObject("SELECT application_status FROM companies WHERE company_id=? FOR UPDATE",String.class,4L)).thenReturn(state);
            var file=new MockMultipartFile("file","legal.pdf","application/pdf",new byte[]{1});
            assertThrows(InvalidStateTransitionException.class,()->new BusinessFileService(jdbc,business,storage).document(user,file),state);
            verifyNoInteractions(storage);
            verify(jdbc,never()).update(anyString(),any(Object[].class));
        }
    }
}
