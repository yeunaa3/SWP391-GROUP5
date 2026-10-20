package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BookmarkService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookmarks")
@PreAuthorize("hasAnyRole('READER', 'SUBSCRIBER')")
public class BookmarkController {
    private final BookmarkService service;

    public BookmarkController(BookmarkService service) {
        this.service = service;
    }

    @GetMapping
    public BookmarkService.Page list(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return service.list(user.id(), page, size);
    }

    @GetMapping("/{articleId}")
    public Map<String, Boolean> status(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @PathVariable long articleId) {
        return Map.of("saved", service.saved(user.id(), articleId));
    }

    @PutMapping("/{articleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @PathVariable long articleId) {
        service.save(user.id(), articleId);
    }

    @DeleteMapping("/{articleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @PathVariable long articleId) {
        service.remove(user.id(), articleId);
    }
}
