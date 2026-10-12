package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.AdminOverviewService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/overview")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AdminOverviewController {
    private final AdminOverviewService service;
    public AdminOverviewController(AdminOverviewService service) { this.service = service; }
    @GetMapping
    public Map<String, Object> overview(@RequestParam(defaultValue = "30") int days) { return service.overview(days); }
}
