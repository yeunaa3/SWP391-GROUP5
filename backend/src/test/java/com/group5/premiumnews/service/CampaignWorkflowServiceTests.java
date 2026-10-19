package com.group5.premiumnews.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.nio.file.Path;

class CampaignWorkflowServiceTests {
    @Test void staleVersionCannotOverwriteAnotherTab(){
        assertThrows(ConflictException.class,()->CampaignWorkflowService.requireVersion(Map.of("edit_version",3),2));
        assertThrows(ConflictException.class,()->CampaignWorkflowService.requireVersion(Map.of("edit_version",3),null));
        assertDoesNotThrow(()->CampaignWorkflowService.requireVersion(Map.of("edit_version",3),3));
    }
    @Test void destinationRejectsExecutableAndCredentialUrls(){
        for(String url:List.of("javascript:alert(1)","file:///private","https://user:secret@example.com","//example.com","https://"))assertThrows(InvalidStateTransitionException.class,()->CampaignWorkflowService.validateUrl(url));
        assertDoesNotThrow(()->CampaignWorkflowService.validateUrl("https://example.com/path?a=1#section"));
    }
    @Test void geoUsesRealIsoCodes(){
        assertEquals("US,VN",CampaignWorkflowService.normalizeGeo("vn, US,VN"));
        assertEquals("ALL",CampaignWorkflowService.normalizeGeo(""));
        assertThrows(InvalidStateTransitionException.class,()->CampaignWorkflowService.normalizeGeo("ZZ"));
    }
    @Test void pausedCampaignIsNeverAutoResumed(){
        JdbcTemplate jdbc=mock(JdbcTemplate.class);
        when(jdbc.queryForList(contains("SELECT ct.company_id"),eq(5L))).thenReturn(List.of(Map.of("company_id",2L)));
        when(jdbc.queryForList(contains("SELECT application_status"),eq(2L))).thenReturn(List.of(Map.of("application_status","APPROVED")));
        when(jdbc.queryForList(contains("SELECT * FROM ad_campaigns"),eq(5L))).thenReturn(List.of(Map.of("campaign_id",5L,"status","PAUSED","scheduled_start_time",LocalDateTime.now().minusDays(1),"scheduled_end_time",LocalDateTime.now().plusDays(1))));
        new CampaignWorkflowService(jdbc,mock(BusinessWorkspaceService.class),mock(BusinessFileService.class),new ObjectMapper()).advanceDelivery(5L);
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void localStorageRejectsTraversalAndPreservesBytes(@TempDir Path directory) throws Exception {
        var storage=new BusinessAssetStorage(directory.toString(),"local","","","",new ObjectMapper());
        byte[] bytes={1,2,3};String key=storage.put(bytes,"image/png","png");
        assertTrue(storage.available(key));assertArrayEquals(bytes,storage.read(key).getContentAsByteArray());
        assertFalse(storage.available("../private.png"));assertThrows(IllegalArgumentException.class,()->storage.read("../private.png"));
        storage.remove(key);assertFalse(storage.available(key));
    }
    @Test void configuredCloudWithoutCredentialsFailsBeforeSendingFile(@TempDir Path directory){
        var storage=new BusinessAssetStorage(directory.toString(),"cloudinary","","","",new ObjectMapper());
        assertThrows(IllegalStateException.class,()->storage.put(new byte[]{1},"image/png","png"));
    }
}
