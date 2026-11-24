package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.BF1_PremiumService;
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

class BF1_PremiumAuthorizationTests {
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean BF1_PremiumService service() { return mock(BF1_PremiumService.class); }
        @Bean AdminOverviewService overviewService() { return mock(AdminOverviewService.class); }
        @Bean BF1_PremiumController controller(BF1_PremiumService service) { return new BF1_PremiumController(service); }
        @Bean AdminOverviewController overviewController(AdminOverviewService service) { return new AdminOverviewController(service); }
    }

    @Test void readersAndBusinessesCannotReadAdminQueuesOrDashboard() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            for (String role : List.of("READER", "BUSINESS", "AD_MANAGER")) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_" + role))));
                assertThrows(AccessDeniedException.class, () -> context.getBean(BF1_PremiumController.class).queue());
                assertThrows(AccessDeniedException.class, () -> context.getBean(AdminOverviewController.class).overview(30));
                assertThrows(AccessDeniedException.class, () -> context.getBean(BF1_PremiumController.class).review(null, 7, new BF1_PremiumController.Review(true, true, "")));
            }
            verifyNoInteractions(context.getBean(BF1_PremiumService.class));
            verifyNoInteractions(context.getBean(AdminOverviewService.class));
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test void administratorCanReadQueue() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))));
            context.getBean(BF1_PremiumController.class).queue();
            verify(context.getBean(BF1_PremiumService.class)).list(null);
        } finally { SecurityContextHolder.clearContext(); }
    }
}
