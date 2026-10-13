package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.NotificationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {
    public record ReadState(boolean read) {}
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service=service; }
    @GetMapping public NotificationService.Inbox inbox(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@RequestParam(required=false) Long before) {
        return service.inbox(user.id(),before);
    }
    @PatchMapping("/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT) public void read(@AuthenticationPrincipal AuthenticatedUserPrincipal user,@PathVariable long id,@RequestBody ReadState body) {
        service.mark(user.id(),id,body.read());
    }
    @PostMapping("/read-all") @ResponseStatus(HttpStatus.NO_CONTENT) public void readAll(@AuthenticationPrincipal AuthenticatedUserPrincipal user) { service.markAll(user.id()); }
}
