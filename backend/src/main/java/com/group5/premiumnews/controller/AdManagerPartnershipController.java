package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.AdManagerDtos;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.AdManagerPartnershipService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ad-manager")
@PreAuthorize("hasRole('AD_MANAGER')")
public class AdManagerPartnershipController {
    private final AdManagerPartnershipService service;

    public AdManagerPartnershipController(AdManagerPartnershipService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public AdManagerDtos.Dashboard dashboard() {
        return service.dashboard();
    }

    @GetMapping("/partnerships")
    public AdManagerDtos.QueuePage queue(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.queue(new AdManagerDtos.QueueFilter(q, status, priority, from, to, page, size));
    }

    @GetMapping("/partnerships/{companyId}")
    public AdManagerDtos.PartnershipDetail detail(@PathVariable long companyId) {
        return service.detail(companyId);
    }

    @PutMapping("/partnerships/{companyId}/note")
    public AdManagerDtos.PartnershipDetail note(
            @PathVariable long companyId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal reviewer,
            @Valid @RequestBody AdManagerDtos.ReviewNoteRequest request) {
        return service.saveNote(companyId, reviewer, request);
    }

    @PostMapping("/partnerships/{companyId}/decision")
    public AdManagerDtos.PartnershipDetail decision(
            @PathVariable long companyId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal reviewer,
            @Valid @RequestBody AdManagerDtos.DecisionRequest request) {
        return service.decide(companyId, reviewer, request);
    }
}
