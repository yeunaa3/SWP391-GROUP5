package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.SubscriptionPackageService;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SubscriptionPackageController {

    private final SubscriptionPackageService service;

    public SubscriptionPackageController(SubscriptionPackageService service) {
        this.service = service;
    }

    /**
     * [UC-35][CFG-05] Lấy danh sách tất cả các gói cước cho Quản trị viên (bao gồm ACTIVE, INACTIVE)
     */
    @GetMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public List<Map<String, Object>> adminList() {
        return service.listAdminPackages();
    }

    /**
     * [UC-35][CFG-05] Tạo gói cước mới
     */
    @PostMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> create(@RequestBody SubscriptionPackageService.PackagePayload payload) {
        return service.create(payload);
    }

    /**
     * [UC-35][CFG-05] Cập nhật thông tin gói cước (giá, tên, số ngày, mô tả)
     */
    @PutMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> update(@PathVariable long id, @RequestBody SubscriptionPackageService.PackagePayload payload) {
        return service.update(id, payload);
    }

    /**
     * [UC-35][CFG-05] Bật / Tắt trạng thái gói cước (ACTIVE <-> INACTIVE)
     */
    @PatchMapping("/admin/packages/{id}/toggle")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> toggle(@PathVariable long id) {
        return service.toggleStatus(id);
    }

    /**
     * [UC-35][CFG-05] Xóa (ẩn) gói cước
     */
    @DeleteMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> delete(@PathVariable long id) {
        service.delete(id);
        return Map.of("message", "Đã xóa gói cước thành công");
    }

    /**
     * [UC-11][PRE-01] Danh sách gói cước công khai đang ACTIVE cho độc giả xem
     */
    @GetMapping("/public/packages")
    public List<Map<String, Object>> publicList() {
        return service.listPublicPackages();
    }
}
