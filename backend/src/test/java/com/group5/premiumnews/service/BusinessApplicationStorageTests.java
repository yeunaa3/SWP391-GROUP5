package com.group5.premiumnews.service;

import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** BUS-03: kho tệp phải còn đủ tài liệu trước mọi cập nhật trạng thái/snapshot. */
class BusinessApplicationStorageTests {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final BusinessAssetStorage storage=mock(BusinessAssetStorage.class);
    private final AuthenticatedUserPrincipal user=new AuthenticatedUserPrincipal(1L,"qa","qa@example.com","unused","QA",4L,true,List.of());

    /** Mô phỏng company hợp lệ; lỗi kho là biến duy nhất trong các testcase dưới. */
    private BusinessWorkspaceService service(int count,List<Map<String,Object>> documents) {
        var company=new HashMap<String,Object>();
        company.put("application_status","DRAFT");company.put("application_version",0);
        for(String key:List.of("company_name","tax_code","email","phone","address","billing_address","industry","contact_person"))company.put(key,"test");
        when(jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=? AND status='ACTIVE'",Long.class,1L)).thenReturn(4L);
        when(jdbc.queryForMap("SELECT * FROM companies WHERE company_id=? FOR UPDATE",4L)).thenReturn(company);
        when(jdbc.queryForObject("SELECT COUNT(*) FROM company_documents WHERE company_id=? AND status='ACTIVE'",Integer.class,4L)).thenReturn(count);
        when(jdbc.queryForList("SELECT document_id,storage_object_key FROM company_documents WHERE company_id=? AND status='ACTIVE'",4L)).thenReturn(documents);
        return new BusinessWorkspaceService(jdbc,storage);
    }

    @Test void oneMissingFileAmongValidDocumentsPreventsAnyDatabaseWrite() {
        var service=service(2,List.of(Map.of("document_id",8L,"storage_object_key","present.png"),Map.of("document_id",9L,"storage_object_key","missing.png")));
        when(storage.available("present.png")).thenReturn(true);
        when(storage.available("missing.png")).thenReturn(false);
        var error=assertThrows(InvalidStateTransitionException.class,()->service.submitApplication(user));
        assertTrue(error.getMessage().contains("không còn khả dụng"));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }

    @Test void nullStorageKeyCannotFreezeProfile() {
        var document=new HashMap<String,Object>();document.put("document_id",8L);document.put("storage_object_key",null);
        var service=service(1,List.of(document));
        assertThrows(InvalidStateTransitionException.class,()->service.submitApplication(user));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }

    @Test void changedDocumentSetCannotProducePartialSnapshot() {
        var service=service(2,List.of(Map.of("document_id",8L,"storage_object_key","present.png")));
        assertThrows(InvalidStateTransitionException.class,()->service.submitApplication(user));
        verifyNoInteractions(storage);
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
