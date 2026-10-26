package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.AdSlotAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/ad-slots")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AdSlotAdminController {
    private final AdSlotAdminService service;

    public AdSlotAdminController(AdSlotAdminService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return service.list();
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody AdSlotAdminService.SlotInput input) {
        return service.create(input);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(
            @PathVariable long id,
            @RequestBody AdSlotAdminService.SlotInput input) {
        return service.update(id, input);
    }
}
