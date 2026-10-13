package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.AdManagerDtos;
import com.group5.premiumnews.service.AdManagerPartnershipService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class AdManagerPartnershipAuthorizationTests {
    @Configuration
    @EnableMethodSecurity
    static class Config {
        @Bean AdManagerPartnershipService service() { return mock(AdManagerPartnershipService.class); }
        @Bean AdManagerPartnershipController controller(AdManagerPartnershipService service) {
            return new AdManagerPartnershipController(service);
        }
    }

    @Test
    void onlyAdManagerCanUsePartnershipReviewEndpoints() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(AdManagerPartnershipController.class);
            var service = context.getBean(AdManagerPartnershipService.class);
            for (String role : List.of("READER", "BUSINESS", "ADMINISTRATOR")) {
                authenticate(role);
                assertThrows(AccessDeniedException.class, controller::dashboard);
                assertThrows(AccessDeniedException.class,
                        () -> controller.detail(12));
            }
            verifyNoInteractions(service);

            authenticate("AD_MANAGER");
            controller.dashboard();
            controller.queue("", "", "", null, null, 0, 20);
            verify(service).dashboard();
            verify(service).queue(new AdManagerDtos.QueueFilter("", "", "", null, null, 0, 20));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test", "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }
}
