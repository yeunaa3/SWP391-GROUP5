package com.group5.premiumnews.service;

import com.group5.premiumnews.integration.email.EmailService;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final JdbcTemplate jdbc;
    private final EmailService emailService;

    @Value("${app.payment.bank-code:MB}")
    private String bankCode;

    @Value("${app.payment.account-number:08882626999}")
    private String accountNumber;

    @Value("${app.payment.account-name:BUI QUANG CUONG}")
    private String accountName;

    public PaymentService(JdbcTemplate jdbc, EmailService emailService) {
        this.jdbc = jdbc;
        this.emailService = emailService;
    }

    public record PaymentQrResponse(
            String qrUrl,
            String bankCode,
            String accountNumber,
            String accountName,
            BigDecimal amount,
            String currency,
            String memo,
            String paymentType,
            long referenceId,
            String itemName
    ) {}

    /**
     * Sinh thông tin VietQR thanh toán tự động cho gói Premium hoặc hợp đồng quảng cáo B2B
     */
    @Transactional(readOnly = true)
    public PaymentQrResponse createQr(String type, long referenceId, AuthenticatedUserPrincipal user) {
        String paymentType = type.trim().toUpperCase();

        if ("PREMIUM".equals(paymentType)) {
            var requests = jdbc.queryForList("""
                    SELECT r.request_id, r.amount, r.currency, r.package_name, r.package_code, r.status, r.user_id
                    FROM premium_requests r
                    WHERE r.request_id = ?
                    """, referenceId);

            if (requests.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu Premium với ID: " + referenceId);
            }

            var req = requests.get(0);
            BigDecimal amount = (BigDecimal) req.get("amount");
            String pkgName = (String) req.get("package_name");
            String memo = "THEPLUSE SUB " + referenceId;

            String cleanAccountName = accountName.replace(" ", "%20");
            String cleanMemo = memo.replace(" ", "%20");
            String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                    bankCode, accountNumber, amount.toBigInteger().toString(), cleanMemo, cleanAccountName);

            return new PaymentQrResponse(qrUrl, bankCode, accountNumber, accountName, amount, "VND", memo, "PREMIUM", referenceId, "Gói " + pkgName);
        } else if ("CONTRACT".equals(paymentType)) {
            var contracts = jdbc.queryForList("""
                    SELECT c.contract_id, c.contract_code, c.contract_name, c.total_value, c.currency, c.payment_status, c.company_id
                    FROM contracts c
                    WHERE c.contract_id = ?
                    """, referenceId);

            if (contracts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng quảng cáo với ID: " + referenceId);
            }

            var ct = contracts.get(0);
            BigDecimal totalValue = (BigDecimal) ct.get("total_value");
            String code = (String) ct.get("contract_code");
            String memo = "THEPLUSE CTR " + referenceId;

            String cleanAccountName = accountName.replace(" ", "%20");
            String cleanMemo = memo.replace(" ", "%20");
            String qrUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                    bankCode, accountNumber, totalValue.toBigInteger().toString(), cleanMemo, cleanAccountName);

            return new PaymentQrResponse(qrUrl, bankCode, accountNumber, accountName, totalValue, "VND", memo, "CONTRACT", referenceId, "Hợp đồng " + code);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại thanh toán không hợp lệ (hỗ trợ PREMIUM hoặc CONTRACT).");
        }
    }

    /**
     * Xác nhận thanh toán tự động (Auto-Confirm / Webhook IPN simulation)
     * - Kích hoạt gói Premium hoặc Hợp đồng ngay tức thì
     * - Ghi log giao dịch SUCCESS
     * - Gửi email biên lai thật (nếu có email)
     */
    @Transactional
    public Map<String, Object> autoConfirm(String type, long referenceId, AuthenticatedUserPrincipal user) {
        String paymentType = type.trim().toUpperCase();

        if ("PREMIUM".equals(paymentType)) {
            return confirmPremium(referenceId, user);
        } else if ("CONTRACT".equals(paymentType)) {
            return confirmContract(referenceId, user);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại thanh toán không hợp lệ: " + type);
        }
    }

    private Map<String, Object> confirmPremium(long requestId, AuthenticatedUserPrincipal user) {
        var requests = jdbc.queryForList("""
                SELECT r.request_id, r.user_id, r.package_id, r.package_code, r.package_name,
                       r.amount, r.currency, r.duration_days, r.status,
                       u.email, u.full_name, u.username
                FROM premium_requests r
                JOIN users u ON u.user_id = r.user_id
                WHERE r.request_id = ? FOR UPDATE
                """, requestId);

        if (requests.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu Premium ID: " + requestId);
        }

        var req = requests.get(0);
        String currentStatus = (String) req.get("status");
        long targetUserId = ((Number) req.get("user_id")).longValue();
        long packageId = ((Number) req.get("package_id")).longValue();
        String packageCode = (String) req.get("package_code");
        String packageName = (String) req.get("package_name");
        BigDecimal amount = (BigDecimal) req.get("amount");
        int durationDays = ((Number) req.get("duration_days")).intValue();
        String email = (String) req.get("email");
        String customerName = (String) req.get("full_name");
        if (customerName == null || customerName.isBlank()) customerName = (String) req.get("username");

        // Idempotent: Nếu đã APPROVED thì báo thành công luôn
        if ("APPROVED".equals(currentStatus)) {
            return Map.of("success", true, "message", "Gói Premium đã được kích hoạt trước đó.", "requestId", requestId);
        }

        Instant now = Instant.now();
        // Kiểm tra xem user có gói đang chạy không để cộng dồn ngày
        var existingEnd = jdbc.query("SELECT MAX(end_at) FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' AND end_at > CURRENT_TIMESTAMP(6)",
                (rs, n) -> rs.getTimestamp(1), targetUserId).stream().findFirst().orElse(null);

        Instant start = (existingEnd != null && existingEnd.toInstant().isAfter(now)) ? existingEnd.toInstant() : now;
        Instant end = start.plus(durationDays, ChronoUnit.DAYS);

        // 1. Tạo bản ghi subscription
        GeneratedKeyHolder subKey = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            var ps = conn.prepareStatement("""
                    INSERT INTO subscriptions(user_id, package_id, package_code_snapshot, package_name_snapshot,
                                              duration_days_snapshot, price_snapshot, currency, start_at, end_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'VND', ?, ?, 'ACTIVE')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, targetUserId);
            ps.setLong(2, packageId);
            ps.setString(3, packageCode);
            ps.setString(4, packageName);
            ps.setInt(5, durationDays);
            ps.setBigDecimal(6, amount);
            ps.setTimestamp(7, Timestamp.from(start));
            ps.setTimestamp(8, Timestamp.from(end));
            return ps;
        }, subKey);
        long subscriptionId = Objects.requireNonNull(subKey.getKey()).longValue();

        // 2. Cập nhật premium_requests
        long adminId = user != null ? user.id() : 1L; // system/admin
        jdbc.update("""
                UPDATE premium_requests
                SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(6),
                    review_note = 'Thanh toán tự động thành công qua Cổng VietQR Napas', subscription_id = ?
                WHERE request_id = ?
                """, adminId, subscriptionId, requestId);

        // 3. Ghi nhận transactions
        String txnRef = "VIETQR-SUB-" + requestId + "-" + System.currentTimeMillis() % 100000;
        jdbc.update("""
                INSERT INTO transactions(txn_ref, transaction_type, user_id, subscription_id, amount, currency, payment_gateway, status, paid_at)
                VALUES (?, 'SUBSCRIPTION', ?, ?, ?, 'VND', 'VIETQR_AUTOPAY', 'SUCCESS', CURRENT_TIMESTAMP(6))
                """, txnRef, targetUserId, subscriptionId, amount);

        // 4. Nâng quyền SUBSCRIBER cho user
        jdbc.update("""
                INSERT IGNORE INTO user_roles(user_id, role_id)
                SELECT ?, role_id FROM roles WHERE role_name = 'SUBSCRIBER' AND status = 'ACTIVE'
                """, targetUserId);

        // 5. Tạo thông báo trong app
        jdbc.update("""
                INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
                VALUES (?, 'Thanh toán Premium thành công', ?, 'PREMIUM', 'SUBSCRIPTION', ?, 'SENT', CURRENT_TIMESTAMP(6))
                """, targetUserId, "Gói " + packageName + " đã kích hoạt thành công. Thời hạn sử dụng đến " + end.toString().substring(0, 10), String.valueOf(subscriptionId));

        // 6. Gửi EMAIL BIÊN LAI THẬT (Nếu có email)
        if (email != null && !email.isBlank() && email.contains("@")) {
            Map<String, Object> emailData = Map.of(
                    "title", "XÁC NHẬN KÍCH HOẠT GÓI PREMIUM",
                    "customerName", customerName,
                    "itemName", packageName,
                    "itemType", "Thuê bao Premium Đọc báo Không giới hạn",
                    "txnRef", txnRef,
                    "amount", String.format("%,d VND", amount.longValue()),
                    "effectiveDuration", durationDays + " ngày (Đến " + end.toString().substring(0, 10) + ")",
                    "paymentGateway", "VietQR Napas 24/7 (Tự động)"
            );
            emailService.sendReceiptEmail(email, "The Pluse - Biên lai thanh toán gói " + packageName, emailData);
        }

        return Map.of(
                "success", true,
                "message", "Thanh toán gói Premium thành công! Đã nâng quyền SUBSCRIBER và gửi email xác nhận.",
                "subscriptionId", subscriptionId,
                "expiresAt", end.toString()
        );
    }

    private Map<String, Object> confirmContract(long contractId, AuthenticatedUserPrincipal user) {
        var contracts = jdbc.queryForList("""
                SELECT c.contract_id, c.contract_code, c.contract_name, c.company_id, c.total_value,
                       c.currency, c.payment_status, c.status, c.slot_name_snapshot, c.start_at, c.end_at,
                       cp.company_name, cp.email AS company_email, cp.contact_name
                FROM contracts c
                JOIN company_profiles cp ON cp.company_id = c.company_id
                WHERE c.contract_id = ? FOR UPDATE
                """, contractId);

        if (contracts.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hợp đồng ID: " + contractId);
        }

        var ct = contracts.get(0);
        String paymentStatus = (String) ct.get("payment_status");
        long companyId = ((Number) ct.get("company_id")).longValue();
        String contractCode = (String) ct.get("contract_code");
        String contractName = (String) ct.get("contract_name");
        BigDecimal totalValue = (BigDecimal) ct.get("total_value");
        String companyEmail = (String) ct.get("company_email");
        String companyName = (String) ct.get("company_name");
        String contactName = (String) ct.get("contact_name");
        if (contactName == null || contactName.isBlank()) contactName = companyName;

        // Idempotent: Nếu đã PAID thì trả về thành công luôn
        if ("PAID".equals(paymentStatus)) {
            return Map.of("success", true, "message", "Hợp đồng đã thanh toán thành công trước đó.", "contractId", contractId);
        }

        // 1. Cập nhật hợp đồng sang PAID và ACTIVE
        jdbc.update("""
                UPDATE contracts
                SET payment_status = 'PAID', status = 'ACTIVE', signed_at = CURRENT_TIMESTAMP(6), updated_at = CURRENT_TIMESTAMP(6)
                WHERE contract_id = ?
                """, contractId);

        // 2. Ghi nhận giao dịch
        long userId = user != null ? user.id() : 1L;
        String txnRef = "VIETQR-CTR-" + contractId + "-" + System.currentTimeMillis() % 100000;
        jdbc.update("""
                INSERT INTO transactions(txn_ref, transaction_type, user_id, contract_id, amount, currency, payment_gateway, status, paid_at)
                VALUES (?, 'CONTRACT_PAYMENT', ?, ?, ?, 'VND', 'VIETQR_AUTOPAY', 'SUCCESS', CURRENT_TIMESTAMP(6))
                """, txnRef, userId, contractId, totalValue);

        // 3. Thông báo cho doanh nghiệp
        jdbc.update("""
                INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
                VALUES (?, 'Hợp đồng quảng cáo đã kích hoạt', ?, 'CAMPAIGN', 'CONTRACT', ?, 'SENT', CURRENT_TIMESTAMP(6))
                """, userId, "Hợp đồng " + contractCode + " đã thanh toán thành công và chuyển sang ACTIVE. Bạn có thể tạo chiến dịch quảng cáo ngay bây giờ.", String.valueOf(contractId));

        // 4. GỬI EMAIL BIÊN LAI THẬT CHO DOANH NGHIỆP (Nếu có email)
        if (companyEmail != null && !companyEmail.isBlank() && companyEmail.contains("@")) {
            Map<String, Object> emailData = Map.of(
                    "title", "XÁC NHẬN THANH TOÁN HỢP ĐỒNG B2B",
                    "customerName", contactName + " (" + companyName + ")",
                    "itemName", contractName + " (" + contractCode + ")",
                    "itemType", "Hợp đồng Quảng cáo Doanh nghiệp B2B",
                    "txnRef", txnRef,
                    "amount", String.format("%,d VND", totalValue.longValue()),
                    "effectiveDuration", "Hợp đồng đã có hiệu lực (ACTIVE)",
                    "paymentGateway", "VietQR Napas 24/7 (Tự động)"
            );
            emailService.sendReceiptEmail(companyEmail, "The Pluse - Xác nhận thanh toán hợp đồng " + contractCode, emailData);
        }

        return Map.of(
                "success", true,
                "message", "Thanh toán hợp đồng thành công! Hợp đồng đã chuyển sang ACTIVE, doanh nghiệp có thể tạo chiến dịch ngay.",
                "contractId", contractId,
                "contractCode", contractCode,
                "status", "ACTIVE"
        );
    }
}
