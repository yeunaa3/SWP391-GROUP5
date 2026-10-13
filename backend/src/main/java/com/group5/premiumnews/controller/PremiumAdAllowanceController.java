package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.PremiumAdAllowanceService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/premium")
public class PremiumAdAllowanceController {
    private final PremiumAdAllowanceService service;
    public PremiumAdAllowanceController(PremiumAdAllowanceService service) { this.service = service; }

    @PostMapping("/ad-allowance")
    @PreAuthorize("isAuthenticated()")
    public PremiumAdAllowanceService.Allowance reserve(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.reserve(user.id());
    }
}
