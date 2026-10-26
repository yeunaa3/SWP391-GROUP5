package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.B2bPackageAdminService;
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

@RestController
@RequestMapping("/api/admin/b2b-packages")
@PreAuthorize("hasAnyRole('ADMINISTRATOR', 'AD_MANAGER')")
public class B2bPackageAdminController {
    private final B2bPackageAdminService service;

    public B2bPackageAdminController(B2bPackageAdminService service) {
        this.service = service;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return service.list();
    }

    @PostMapping
    public Map<String, Object> create(
            @RequestBody B2bPackageAdminService.PackageInput input) {
        return service.create(input);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(
            @PathVariable long id,
            @RequestBody B2bPackageAdminService.PackageInput input) {
        return service.update(id, input);
    }
}