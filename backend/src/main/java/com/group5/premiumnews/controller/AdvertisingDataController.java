package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.AdvertisingDataService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
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
}
