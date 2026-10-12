package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.ManualPremiumService;
import com.group5.premiumnews.service.AdminOverviewService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ManualPremiumAuthorizationTests {
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean ManualPremiumService service() { return mock(ManualPremiumService.class); }
        @Bean AdminOverviewService overviewService() { return mock(AdminOverviewService.class); }
        @Bean ManualPremiumController controller(ManualPremiumService service) { return new ManualPremiumController(service); }
        @Bean AdminOverviewController overviewController(AdminOverviewService service) { return new AdminOverviewController(service); }
    }

    @Test void readersAndBusinessesCannotReadAdminQueuesOrDashboard() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            for (String role : List.of("READER", "BUSINESS", "AD_MANAGER")) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_" + role))));
                assertThrows(AccessDeniedException.class, () -> context.getBean(ManualPremiumController.class).queue());
                assertThrows(AccessDeniedException.class, () -> context.getBean(AdminOverviewController.class).overview(30));
                assertThrows(AccessDeniedException.class, () -> context.getBean(ManualPremiumController.class).review(null, 7, new ManualPremiumController.Review(true, true, "")));
            }
            verifyNoInteractions(context.getBean(ManualPremiumService.class));
            verifyNoInteractions(context.getBean(AdminOverviewService.class));
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test void administratorCanReadQueue() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))));
            context.getBean(ManualPremiumController.class).queue();
            verify(context.getBean(ManualPremiumService.class)).list(null);
        } finally { SecurityContextHolder.clearContext(); }
    }
}
