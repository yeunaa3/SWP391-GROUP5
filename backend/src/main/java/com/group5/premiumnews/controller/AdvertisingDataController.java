package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.AdvertisingDataService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/advertising")
public class AdvertisingDataController {
    private final AdvertisingDataService service;
    public AdvertisingDataController(AdvertisingDataService service) { this.service = service; }
    @GetMapping("/banners")
    public List<Map<String, Object>> banners(@RequestParam String position) { return service.banners(position); }
    @GetMapping("/campaign-data")
    public List<Map<String, Object>> campaigns(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.campaigns(principal);
    }
    @GetMapping("/performance")
    public List<Map<String, Object>> performance(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.performance(principal);
    }
    @GetMapping("/availability")
    public List<Map<String, Object>> availability() { return service.availability(); }

    @PostMapping("/events/impression")
    public Map<String, Object> impression(@RequestBody(required = false) Map<String, Object> body) {
        Long creativeId = null;
        if (body != null && body.get("creativeId") != null) {
            try {
                creativeId = Long.valueOf(body.get("creativeId").toString());
            } catch (Exception ignored) {
            }
        }
        service.recordImpression(creativeId);
        return Map.of("success", true);
    }

    @GetMapping("/click/{creativeId}")
    public void click(@PathVariable Long creativeId, HttpServletResponse response) throws IOException {
        String targetUrl = service.recordClickAndGetTargetUrl(creativeId);
        response.sendRedirect(targetUrl);
    }

    @PostMapping("/campaigns/{id}/toggle-status")
    @PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")
    public Map<String, Object> toggleStatus(@PathVariable Long id) {
        return service.toggleCampaignStatus(id);
    }
}
