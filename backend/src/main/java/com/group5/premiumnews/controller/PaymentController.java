package com.group5.premiumnews.controller;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.PaymentService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    public record QrRequest(String type, long referenceId) {}
    public record ConfirmRequest(String type, long referenceId) {}

    /**
     * [API-01] Sinh mã VietQR Napas thanh toán tự động cho gói Premium hoặc Hợp đồng B2B
     */
    @PostMapping("/create-qr")
    @PreAuthorize("isAuthenticated()")
    public PaymentService.PaymentQrResponse createQr(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @RequestBody QrRequest request) {
        return paymentService.createQr(request.type(), request.referenceId(), user);
    }

    /**
     * [API-02] Xác nhận thanh toán tự động (Auto-Confirm / Webhook IPN)
     * - Kích hoạt gói cước Premium cho độc giả hoặc Hợp đồng B2B cho doanh nghiệp ngay lập tức
     * - Tự động gửi Email hóa đơn/biên lai nếu có email
     */
    @PostMapping("/auto-confirm")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> autoConfirm(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @RequestBody ConfirmRequest request) {
        return paymentService.autoConfirm(request.type(), request.referenceId(), user);
    }

    /**
     * Webhook công khai nhận callback từ cổng thanh toán bên ngoài (như PayOS / SePay)
     */
    @PostMapping("/webhook")
    public Map<String, Object> webhook(@RequestBody Map<String, Object> payload) {
        // Hỗ trợ webhook IPN từ bên thứ ba nếu có
        return Map.of("status", "RECEIVED", "success", true);
    }
}
