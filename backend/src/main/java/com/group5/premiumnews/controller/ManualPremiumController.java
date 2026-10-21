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

/**
 * ============================================================================
 * [BF-01] MANUAL PREMIUM CONTROLLER
 * Phụ trách: Cường (API Đăng ký gói, Kiểm tra quyền đọc báo, Lịch sử giao dịch & Duyệt gói)
 * 
 * REST API Endpoints:
 * - GET  /api/premium/access                 : [UC-12] Kiểm tra trạng thái gói cước đang sở hữu
 * - POST /api/premium/requests               : [UC-11] Gửi yêu cầu mua gói mới (chờ chuyển khoản)
 * - POST /api/premium/requests/{id}/cancel   : [Swimlane Cancel] Hủy yêu cầu chờ thanh toán
 * - GET  /api/premium/requests               : [UC-11] Xem danh sách yêu cầu cá nhân
 * - GET  /api/premium/transactions           : [UC-13] Lịch sử thanh toán của người dùng
 * - GET  /api/premium/transactions/{id}      : [UC-13] Chi tiết biên lai giao dịch
 * - GET  /api/admin/premium-requests         : [UC-14] Hàng đợi yêu cầu chờ Admin duyệt
 * - POST /api/admin/premium-requests/{id}/review : [UC-14] Admin phê duyệt / từ chối kích hoạt
 * ============================================================================
 */
@RestController
@RequestMapping("/api")
public class ManualPremiumController {

    public record Submit(@NotNull @Positive Long packageId) {}
    public record Review(boolean approve, boolean paymentConfirmed, @Size(max = 500) String note) {}

    private final ManualPremiumService service;

    public ManualPremiumController(ManualPremiumService service) {
        this.service = service;
    }

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
