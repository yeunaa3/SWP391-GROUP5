package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.ManualPremiumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ManualPremiumController {
    public record Submit(@NotNull @Positive Long packageId) {}
    public record Review(boolean approve, boolean paymentConfirmed, @Size(max = 500) String note) {}
    private final ManualPremiumService service;
    public ManualPremiumController(ManualPremiumService service) { this.service = service; }

    @GetMapping("/premium/access")
    @PreAuthorize("isAuthenticated()")
    public Map<String,Object> access(@AuthenticationPrincipal AuthenticatedUserPrincipal user) { return service.access(user.id()); }

    @PostMapping("/premium/requests")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public Map<String,Object> submit(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @Valid @RequestBody Submit body) {
        return service.submit(user.id(), body.packageId());
    }

    @GetMapping("/premium/requests")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public List<Map<String,Object>> mine(@AuthenticationPrincipal AuthenticatedUserPrincipal user) { return service.list(user.id()); }

    @GetMapping("/premium/transactions")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public List<Map<String,Object>> myTransactions(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.listTransactions(user.id());
    }

    @GetMapping("/premium/transactions/{id}")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public Map<String,Object> transactionDetail(@AuthenticationPrincipal AuthenticatedUserPrincipal user, @PathVariable long id) {
        return service.getTransactionDetail(user.id(), id);
    }

    @GetMapping("/admin/premium-requests")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public List<Map<String,Object>> queue() { return service.list(null); }

    @PostMapping("/admin/premium-requests/{id}/review")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String,Object> review(@AuthenticationPrincipal AuthenticatedUserPrincipal admin, @PathVariable long id, @Valid @RequestBody Review body) {
        service.review(admin.id(), id, body.approve(), body.paymentConfirmed(), body.note());
        return Map.of("status", body.approve() ? "APPROVED" : "REJECTED");
    }
}
