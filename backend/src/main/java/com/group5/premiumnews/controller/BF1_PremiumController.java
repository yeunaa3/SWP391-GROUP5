package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.BF1_PremiumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * ============================================================================
 * [BF-01] LUỒNG 1: THUÊ BAO PREMIUM, QUẢN LÝ GÓI & GIAO DỊCH (REST API CONTROLLER)
 * Phụ trách: Cường
 * 
 * REST API Endpoints:
 * - DANH MỤC GÓI CƯỚC (PACKAGES):
 *   + GET  /api/public/packages                  : [UC-11][PRE-01] Danh sách gói đang mở bán cho độc giả
 *   + GET  /api/admin/packages                   : [UC-35][CFG-05] Danh sách toàn bộ gói cước cho Quản trị viên
 *   + POST /api/admin/packages                   : [UC-35][CFG-05] Tạo gói cước mới
 *   + PUT  /api/admin/packages/{id}              : [UC-35][CFG-05] Cập nhật gói cước
 *   + PATCH /api/admin/packages/{id}/toggle      : [UC-35][CFG-05] Bật / Tắt gói cước (ACTIVE <-> INACTIVE)
 *   + DELETE /api/admin/packages/{id}            : [UC-35][CFG-05] Xóa thông minh (Xóa hẳn nếu chưa có ai mua / Tạm ẩn nếu đã có lịch sử)
 * 
 * - ĐĂNG KÝ & DUYỆT THUÊ BAO (SUBSCRIPTIONS):
 *   + GET  /api/premium/access                   : [UC-12] Kiểm tra trạng thái gói cước đang sở hữu
 *   + POST /api/premium/requests                 : [UC-11] Gửi yêu cầu mua gói mới (chờ chuyển khoản)
 *   + POST /api/premium/requests/{id}/cancel     : [Swimlane Cancel] Hủy yêu cầu chờ thanh toán
 *   + GET  /api/premium/requests                 : [UC-11] Xem danh sách yêu cầu cá nhân
 *   + GET  /api/premium/transactions             : [UC-13] Lịch sử thanh toán của người dùng
 *   + GET  /api/premium/transactions/{id}        : [UC-13] Chi tiết biên lai giao dịch
 *   + GET  /api/admin/premium-requests           : [UC-14] Hàng đợi yêu cầu chờ Admin duyệt
 *   + POST /api/admin/premium-requests/{id}/review : [UC-14] Admin phê duyệt / từ chối kích hoạt
 * ============================================================================
 */
@RestController
@RequestMapping("/api")
public class BF1_PremiumController {

    public record Submit(@NotNull @Positive Long packageId) {}
    public record Review(boolean approve, boolean paymentConfirmed, @Size(max = 500) String note) {}

    private final BF1_PremiumService service;

    public BF1_PremiumController(BF1_PremiumService service) {
        this.service = service;
    }

    // =========================================================================
    // 1. ENDPOINTS QUẢN LÝ GÓI CƯỚC (UC-35)
    // =========================================================================

    /**
     * [UC-11][PRE-01] Danh sách gói cước công khai đang ACTIVE cho độc giả xem.
     */
    @GetMapping("/public/packages")
    public List<Map<String, Object>> publicList() {
        return service.listPublicPackages();
    }

    /**
     * [UC-35][CFG-05] Lấy danh sách tất cả các gói cước cho Quản trị viên (bao gồm ACTIVE, INACTIVE).
     */
    @GetMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public List<Map<String, Object>> adminList() {
        return service.listAdminPackages();
    }

    /**
     * [UC-35][CFG-05] Tạo gói cước mới.
     */
    @PostMapping("/admin/packages")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> create(@RequestBody BF1_PremiumService.PackagePayload payload) {
        return service.createPackage(payload);
    }

    /**
     * [UC-35][CFG-05] Cập nhật thông tin gói cước.
     */
    @PutMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> update(@PathVariable long id, @RequestBody BF1_PremiumService.PackagePayload payload) {
        return service.updatePackage(id, payload);
    }

    /**
     * [UC-35][CFG-05] Bật / Tắt trạng thái gói cước (ACTIVE <-> INACTIVE).
     */
    @PatchMapping("/admin/packages/{id}/toggle")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> toggle(@PathVariable long id) {
        return service.togglePackageStatus(id);
    }

    /**
     * [UC-35][CFG-05] Xóa thông minh gói cước:
     * - Nếu gói test chưa từng có ai mua: Xóa hẳn khỏi Database (DELETE).
     * - Nếu gói đã có lịch sử thuê bao: Chuyển sang Tạm ẩn (INACTIVE) để bảo toàn khóa ngoại ON DELETE RESTRICT.
     */
    @DeleteMapping("/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> delete(@PathVariable long id) {
        return service.deletePackage(id);
    }

    // =========================================================================
    // 2. ENDPOINTS THUÊ BAO, THANH TOÁN & DUYỆT GÓI (BF-01 CORE)
    // =========================================================================

    /**
     * [BF-01][UC-12][Subscription Check] Kiểm tra người dùng có gói Premium hợp lệ hay không.
     */
    @GetMapping("/premium/access")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> access(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.access(user.id());
    }

    /**
     * [BF-01][UC-11][PRE-04] Người đọc gửi yêu cầu đăng ký gói cước mới.
     */
    @PostMapping("/premium/requests")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public Map<String, Object> submit(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @Valid @RequestBody Submit body) {
        return service.submit(user.id(), body.packageId());
    }

    /**
     * [BF-01][Swimlane Cancel] Người đọc chủ động hủy yêu cầu thanh toán đang PENDING.
     */
    @PostMapping("/premium/requests/{id}/cancel")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public Map<String, Object> cancel(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @PathVariable long id) {
        return service.cancel(user.id(), id);
    }

    /**
     * [BF-01][UC-11] Xem danh sách yêu cầu đăng ký của chính người dùng đang đăng nhập.
     */
    @GetMapping("/premium/requests")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public List<Map<String, Object>> mine(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.list(user.id());
    }

    /**
     * [BF-01][UC-13] Lấy danh sách toàn bộ lịch sử biên lai giao dịch đã phát sinh.
     */
    @GetMapping("/premium/transactions")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public List<Map<String, Object>> myTransactions(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return service.listTransactions(user.id());
    }

    /**
     * [BF-01][UC-13] Xem chi tiết thông tin thanh toán của một biên lai cụ thể.
     */
    @GetMapping("/premium/transactions/{id}")
    @PreAuthorize("hasAnyRole('READER','SUBSCRIBER')")
    public Map<String, Object> transactionDetail(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @PathVariable long id) {
        return service.getTransactionDetail(user.id(), id);
    }

    /**
     * [BF-01][UC-14] Hàng đợi duyệt yêu cầu mua gói dành riêng cho Quản trị viên.
     */
    @GetMapping("/admin/premium-requests")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public List<Map<String, Object>> queue() {
        return service.list(null);
    }

    /**
     * [BF-01][UC-14] Quản trị viên phê duyệt hoặc từ chối kích hoạt gói sau khi đối soát sao kê.
     */
    @PostMapping("/admin/premium-requests/{id}/review")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> review(
            @AuthenticationPrincipal AuthenticatedUserPrincipal admin,
            @PathVariable long id,
            @Valid @RequestBody Review body) {
        service.review(admin.id(), id, body.approve(), body.paymentConfirmed(), body.note());
        return Map.of("status", body.approve() ? "APPROVED" : "REJECTED");
    }
}
