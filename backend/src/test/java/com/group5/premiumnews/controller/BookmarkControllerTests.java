package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BookmarkService;
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

class BookmarkControllerTests {
    @Configuration @EnableMethodSecurity static class Config {
        @Bean BookmarkService service() { return mock(BookmarkService.class); }
        @Bean BookmarkController controller(BookmarkService service) { return new BookmarkController(service); }
    }
    @Test void nonReaderRolesCannotAccessOrMutateBookmarks() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(BookmarkController.class);
            for (String role : List.of("BUSINESS", "AD_MANAGER", "ADMINISTRATOR")) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test", "unused", List.of(new SimpleGrantedAuthority("ROLE_" + role))));
                assertThrows(AccessDeniedException.class, () -> controller.list(null, 0, 10));
                assertThrows(AccessDeniedException.class, () -> controller.status(null, 5));
                assertThrows(AccessDeniedException.class, () -> controller.save(null, 5));
                assertThrows(AccessDeniedException.class, () -> controller.remove(null, 5));
            }
            verifyNoInteractions(context.getBean(BookmarkService.class));
        } finally { SecurityContextHolder.clearContext(); }
    }
    @Test void readerOperationsAlwaysUseAuthenticatedOwner() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var user = new AuthenticatedUserPrincipal(17L, "reader", "r@example.test", "unused", "Reader", null, true, List.of(new SimpleGrantedAuthority("ROLE_READER")));
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, "unused", user.authorities()));
            var controller = context.getBean(BookmarkController.class);
            controller.list(user, 0, 10); controller.save(user, 42); controller.remove(user, 42);
            var service = context.getBean(BookmarkService.class);
            verify(service).list(17L, 0, 10); verify(service).save(17L, 42L); verify(service).remove(17L, 42L);
        } finally { SecurityContextHolder.clearContext(); }
    }
}