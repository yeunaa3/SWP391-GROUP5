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

    public record QrRequest(String type, Long referenceId, Long subscriptionId, Long contractId) {
        public long resolvedReferenceId() {
            if (referenceId != null && referenceId > 0) return referenceId;
            if (subscriptionId != null && subscriptionId > 0) return subscriptionId;
            if (contractId != null && contractId > 0) return contractId;
            return 0L;
        }
    }

    public record ConfirmRequest(String type, Long referenceId, Long subscriptionId, Long contractId) {
        public long resolvedReferenceId() {
            if (referenceId != null && referenceId > 0) return referenceId;
            if (subscriptionId != null && subscriptionId > 0) return subscriptionId;
            if (contractId != null && contractId > 0) return contractId;
            return 0L;
        }
    }

    /**
     * [API-01] Sinh mã VietQR Napas thanh toán tự động cho gói Premium hoặc Hợp đồng B2B
     */
    @PostMapping("/create-qr")
    @PreAuthorize("isAuthenticated()")
    public PaymentService.PaymentQrResponse createQr(
            @AuthenticationPrincipal AuthenticatedUserPrincipal user,
            @RequestBody QrRequest request) {
        return paymentService.createQr(request.type(), request.resolvedReferenceId(), user);
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
        return paymentService.autoConfirm(request.type(), request.resolvedReferenceId(), user);
    }

    /**
     * [API-03] Kiểm tra trạng thái thanh toán tự động (Auto-Polling ngầm trên Frontend)
     */
    @GetMapping("/status")
    public Map<String, Object> checkStatus(
            @RequestParam String type,
            @RequestParam long id,
            @RequestParam(required = false) Long orderCode) {
        return paymentService.checkStatus(type, id, orderCode);
    }

    /**
     * [API-04] Endpoint kiểm tra tình trạng kết nối PayOS trực tiếp (Dùng để chẩn đoán cấu hình)
     */
    @GetMapping("/payos-check")
    public Map<String, Object> checkPayosConfig() {
        boolean configured = paymentService.isPayOsConfigured();
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        res.put("payOsConfigured", configured);
        res.put("bankCode", paymentService.getBankCode());
        res.put("accountNumber", paymentService.getAccountNumber());
        res.put("accountName", paymentService.getAccountName());

        if (configured) {
            try {
                long testOrderCode = (System.currentTimeMillis() % 900000000L) + 100000000L;
                var testLink = paymentService.getPayOSService().createPaymentLink(
                        testOrderCode,
                        10000,
                        "TESTPAYOS " + testOrderCode,
                        "Test Buyer",
                        "test@thepluse.vn",
                        "",
                        "https://swp391-group5-71mj.onrender.com/",
                        "https://swp391-group5-71mj.onrender.com/"
                );
                res.put("payOsConnection", "SUCCESS");
                res.put("testOrderCode", testOrderCode);
                res.put("testCheckoutUrl", testLink.checkoutUrl());
            } catch (Exception e) {
                res.put("payOsConnection", "FAILED");
                res.put("error", e.getMessage());
            }
        } else {
            res.put("payOsConnection", "NOT_CONFIGURED");
            res.put("note", "Chưa nhận diện được biến môi trường PayOS trên Render (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY)");
        }
        return res;
    }

    /**
     * Webhook công khai nhận callback từ cổng thanh toán bên ngoài (như PayOS / SePay)
     */
    @PostMapping("/webhook")
    public Map<String, Object> webhook(@RequestBody Map<String, Object> payload) {
        return paymentService.processPayOSWebhook(payload);
    }

    /**
     * Webhook chính thức của PayOS
     */
    @PostMapping("/payos/webhook")
    public Map<String, Object> payosWebhook(@RequestBody Map<String, Object> payload) {
        return paymentService.processPayOSWebhook(payload);
    }
}
