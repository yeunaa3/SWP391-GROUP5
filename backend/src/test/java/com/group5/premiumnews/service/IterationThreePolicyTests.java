package com.group5.premiumnews.service;
import java.util.*;
import com.group5.premiumnews.exception.ConflictException;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class IterationThreePolicyTests {
    @Test void imageSizeBoundaries(){
        assertEquals("1",SystemSettingsService.validate("creative.max.image.bytes","1"));
        assertEquals("52428800",SystemSettingsService.validate("creative.max.image.bytes","52428800"));
        assertThrows(ResponseStatusException.class,()->SystemSettingsService.validate("creative.max.image.bytes","52428801"));
    }
    @Test void settingsRejectNonIntegerAndUnknownKeys(){
        for(String value:List.of("0","-1","1.5","1e4","true"," 100","999999999999999999999"))
            assertThrows(ResponseStatusException.class,()->SystemSettingsService.validate("creative.max.video.bytes",value));
        assertThrows(ResponseStatusException.class,()->SystemSettingsService.validate("payment.currency","100"));
    }
    @Test void accessVersionRejectsStaleAndMissing(){
        assertDoesNotThrow(()->AccessAdministrationService.version(Map.of("version",3L),3L));
        assertThrows(ConflictException.class,()->AccessAdministrationService.version(Map.of("version",3L),2L));
        assertThrows(ConflictException.class,()->AccessAdministrationService.version(Map.of("version",3L),null));
    }
    @Test void permissionsCannotInjectArbitrarySpringAuthority(){
        assertThrows(ResponseStatusException.class,()->AccessAdministrationService.validatePermissions(List.of("ROLE_ADMINISTRATOR")));
        assertThrows(ResponseStatusException.class,()->AccessAdministrationService.validatePermissions(List.of()));
        assertDoesNotThrow(()->AccessAdministrationService.validatePermissions(List.of("READER","BUSINESS")));
    }
}
