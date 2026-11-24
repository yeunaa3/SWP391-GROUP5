package com.group5.premiumnews.service;

import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * ============================================================================
 * [BF-01] LUỒNG 1: THUÊ BAO PREMIUM, QUẢN LÝ GÓI & DUYỆT ĐƠN (SERVICE & TRUY VẤN DB)
 * Phụ trách: Cường
 *
 * Kiến trúc: Gộp toàn bộ xử lý nghiệp vụ và câu lệnh SQL (JdbcTemplate) vào Service
 * (đồng bộ kiến trúc trực tiếp với BF8_AdServingService và BF9_AdMonitorService)
 * 
 * Các Use Case xử lý:
 * - [UC-35][CFG-05] Quản lý danh mục gói cước (Thêm, Sửa, Bật/Tắt, Xóa thông minh Smart Delete)
 * - [UC-11] Đăng ký mua gói cước mới (chuyển khoản ngân hàng / QR VietQR), chống spam submit
 * - [UC-12] Kiểm tra quyền hạn đọc báo không quảng cáo (Access Check)
 * - [UC-13] Lịch sử biên lai thanh toán & chi tiết hóa đơn
 * - [UC-14] Admin đối soát sao kê và duyệt/từ chối kích hoạt (cộng dồn hạn nối tiếp)
 * - [Swimlane Cancel] Hủy đơn chờ thanh toán khi muốn đổi gói
 * ============================================================================
 */
@Service
public class BF1_PremiumService {

    public record Subscription(long id, long packageId, String packageName, Instant startAt, Instant endAt, String status, boolean current) {}
    public record Plan(long id, String code, String name, BigDecimal amount, String currency, int days) {}
    public record Request(long id, long userId, Plan plan, String status) {}
    public record PackagePayload(
            String code,
            String name,
            String description,
            BigDecimal price,
            String currency,
            int durationDays,
            int displayOrder,
            String status
    ) {}

    private final JdbcTemplate jdbc;

    public BF1_PremiumService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // =========================================================================
    // 1. QUẢN LÝ DANH MỤC GÓI CƯỚC PREMIUM (UC-35)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAdminPackages() {
        return jdbc.queryForList("""
                SELECT package_id AS id, code, name, description, benefits, price, currency,
                       duration_days AS durationDays, display_order AS displayOrder, status,
                       created_at AS createdAt, updated_at AS updatedAt
                FROM subscription_packages
                ORDER BY display_order ASC, package_id ASC
                """);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublicPackages() {
        return jdbc.queryForList("""
                SELECT package_id AS id, code, name, description, benefits, price, currency,
                       duration_days AS durationDays, display_order AS displayOrder, status
                FROM subscription_packages
                WHERE status = 'ACTIVE'
                ORDER BY display_order ASC, package_id ASC
                """);
    }

    @Transactional
    public Map<String, Object> createPackage(PackagePayload payload) {
        if (payload.code() == null || payload.code().isBlank() || payload.name() == null || payload.name().isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Mã gói và tên gói không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw error(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw error(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
        }

        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM subscription_packages WHERE code = ?", Integer.class, payload.code().trim());
        if (count != null && count > 0) {
            throw error(HttpStatus.CONFLICT, "Mã gói cước '" + payload.code().trim().toUpperCase() + "' đã tồn tại.");
        }

        String currency = (payload.currency() != null && !payload.currency().isBlank()) ? payload.currency().trim().toUpperCase() : "VND";
        String status = (payload.status() != null && !payload.status().isBlank()) ? payload.status().trim().toUpperCase() : "ACTIVE";

        jdbc.update("""
                INSERT INTO subscription_packages(code, name, description, price, currency, duration_days, display_order, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                payload.code().trim().toUpperCase(),
                payload.name().trim(),
                payload.description() != null ? payload.description().trim() : "",
                payload.price(),
                currency,
                payload.durationDays(),
                payload.displayOrder(),
                status
        );

        return Map.of("message", "Tạo gói cước mới thành công", "code", payload.code().trim().toUpperCase());
    }

    @Transactional
    public Map<String, Object> updatePackage(long id, PackagePayload payload) {
        if (payload.name() == null || payload.name().isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Tên gói cước không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw error(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw error(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
        }

        int updated = jdbc.update("""
                UPDATE subscription_packages
                SET name = ?, description = ?, price = ?, duration_days = ?, display_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP(6)
                WHERE package_id = ?
                """,
                payload.name().trim(),
                payload.description() != null ? payload.description().trim() : "",
                payload.price(),
                payload.durationDays(),
                payload.displayOrder(),
                payload.status() != null ? payload.status() : "ACTIVE",
                id
        );

        if (updated == 0) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        return Map.of("message", "Cập nhật thông tin gói cước thành công", "id", id);
    }

    @Transactional
    public Map<String, Object> togglePackageStatus(long id) {
        List<String> list = jdbc.queryForList("SELECT status FROM subscription_packages WHERE package_id = ?", String.class, id);
        if (list.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        String currentStatus = list.get(0);
        String nextStatus = "ACTIVE".equalsIgnoreCase(currentStatus) ? "INACTIVE" : "ACTIVE";
        jdbc.update("UPDATE subscription_packages SET status = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE package_id = ?", nextStatus, id);

        return Map.of("message", "Đã đổi trạng thái gói sang " + nextStatus, "status", nextStatus);
    }

    /**
     * [BF-01][Smart Delete] Xóa thông minh gói cước:
     * - Nếu gói test chưa có ai mua: Xóa hẳn khỏi Database (DELETE).
     * - Nếu gói đã có lịch sử thuê bao: Chuyển sang Tạm ẩn (INACTIVE) để bảo toàn khóa ngoại ON DELETE RESTRICT.
     */
    @Transactional
    public Map<String, Object> deletePackage(long id) {
        List<String> list = jdbc.queryForList("SELECT status FROM subscription_packages WHERE package_id = ?", String.class, id);
        if (list.isEmpty()) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }
        String currentStatus = list.get(0);

        Integer subCount = jdbc.queryForObject("SELECT COUNT(*) FROM subscriptions WHERE package_id = ?", Integer.class, id);
        Integer reqCount = jdbc.queryForObject("SELECT COUNT(*) FROM premium_requests WHERE package_id = ?", Integer.class, id);
        boolean hasHistory = (subCount != null && subCount > 0) || (reqCount != null && reqCount > 0);

        if (!hasHistory) {
            // Gói test chưa từng có phát sinh giao dịch -> Xóa cứng vĩnh viễn khỏi Database
            jdbc.update("DELETE FROM subscription_packages WHERE package_id = ?", id);
            return Map.of("message", "Đã xóa vĩnh viễn gói cước khỏi hệ thống", "mode", "HARD_DELETE", "id", id);
        } else {
            // Gói đã có giao dịch -> Xóa mềm sang INACTIVE
            jdbc.update("UPDATE subscription_packages SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP(6) WHERE package_id = ?", id);
            if ("INACTIVE".equalsIgnoreCase(currentStatus)) {
                return Map.of("message", "Gói này đã ở trạng thái Tạm ẩn (bảo tồn do đã có dữ liệu hợp đồng lịch sử)", "mode", "ALREADY_INACTIVE", "id", id);
            }
            return Map.of("message", "Đã chuyển gói sang trạng thái Tạm ẩn (bảo toàn lịch sử giao dịch)", "mode", "SOFT_DELETE", "id", id);
        }
    }

    // =========================================================================
    // 2. NGHIỆP VỤ ĐĂNG KÝ, THANH TOÁN & DUYỆT GÓI (BF-01 CORE)
    // =========================================================================

    /**
     * [BF-01][UC-11][PRE-04] Người đọc gửi yêu cầu mua gói Premium mới.
     * Khóa dòng tài khoản để tránh gửi trùng lặp, kiểm tra nếu đã có yêu cầu PENDING thì không tạo thêm.
     */
    @Transactional
    public Map<String, Object> submit(long userId, long packageId) {
        if (!lockActiveUser(userId)) {
            throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
        }

        var pendingReq = pending(userId);
        if (pendingReq.isPresent()) {
            if (pendingReq.get().plan().id() != packageId) {
                // Tự động hủy đơn PENDING cũ để chuyển sang gói mới mà không bắt user chờ
                cancelRequest(pendingReq.get().id(), "Đã tự động hủy để chuyển sang gói cước mới");
            } else {
                return Map.of("id", pendingReq.get().id(), "status", "PENDING");
            }
        }

        var plan = activePlan(packageId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói cước không còn mở bán."));

        long requestId = createRequest(userId, plan);
        return Map.of("id", requestId, "status", "PENDING");
    }

    /**
     * [BF-01][Swimlane Cancel] Người đọc chủ động hủy yêu cầu thanh toán đang PENDING.
     */
    @Transactional
    public Map<String, Object> cancel(long userId, long requestId) {
        var req = lockRequest(requestId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu Premium ID: " + requestId));
        if (req.userId() != userId) {
            throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên yêu cầu này.");
        }
        if (!"PENDING".equals(req.status())) {
            throw error(HttpStatus.CONFLICT, "Chỉ có thể hủy yêu cầu đang ở trạng thái chờ thanh toán (PENDING).");
        }
        cancelRequest(requestId, "Đã hủy bởi người dùng để đổi gói");
        return Map.of("success", true, "message", "Đã hủy yêu cầu thanh toán thành công.", "requestId", requestId);
    }

    /**
     * [BF-01][UC-11] Lấy danh sách yêu cầu đăng ký gói cước của một người dùng (hoặc toàn bộ cho Admin).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long userId) {
        String sql = """
                SELECT r.request_id AS id, r.user_id AS userId, u.username, u.email,
                       r.package_name AS packageName, r.amount, r.currency, r.duration_days AS durationDays,
                       r.status, r.submitted_at AS submittedAt, r.review_note AS reviewNote,
                       r.reviewed_at AS reviewedAt, r.reviewed_by AS reviewedBy,
                       s.start_at AS startAt, s.end_at AS endAt
                FROM premium_requests r JOIN users u ON u.user_id=r.user_id
                LEFT JOIN subscriptions s ON s.subscription_id=r.subscription_id
                """;
        return userId == null
                ? jdbc.queryForList(sql + " ORDER BY (r.status='PENDING') DESC, r.submitted_at DESC LIMIT 200")
                : jdbc.queryForList(sql + " WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 100", userId);
    }

    /**
     * [BF-01][UC-12][Subscription Check] Kiểm tra trạng thái bản quyền Premium của người đọc.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> access(long userId) {
        var subs = subscriptions(userId);
        var pend = pending(userId);
        boolean isActive = subs.stream().anyMatch(Subscription::current);

        return Map.of(
                "active", isActive,
                "subscriptions", subs,
                "pendingPackageId", pend.map(r -> r.plan().id()).orElse(0L)
        );
    }

    /**
     * [BF-01][UC-14][PRE-04] Quản trị viên đối soát sao kê ngân hàng và phê duyệt kích hoạt gói.
     */
    @Transactional
    public void review(long adminId, long id, boolean approve, boolean paymentConfirmed, String note) {
        var request = lockRequest(id)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu nâng cấp gói."));

        if (!"PENDING".equals(request.status())) {
            throw error(HttpStatus.CONFLICT, "Yêu cầu đã được xử lý trước đó. Không thể thao tác lại.");
        }
        if (!lockActiveUser(request.userId())) {
            throw error(HttpStatus.CONFLICT, "Tài khoản người mua hiện không ở trạng thái hoạt động.");
        }

        Long subscriptionId = null;
        if (approve) {
            if (!paymentConfirmed) {
                throw error(HttpStatus.BAD_REQUEST, "Admin phải xác nhận đã kiểm tra tiền về tài khoản trước khi duyệt.");
            }
            Instant now = Instant.now();
            Instant previousEnd = latestExpiry(request.userId());
            // Nếu người dùng đang còn hạn, cộng dồn ngày bắt đầu nối tiếp hạn cũ
            Instant start = (previousEnd != null && previousEnd.isAfter(now)) ? previousEnd : now;
            Instant end = start.plus(request.plan().days(), ChronoUnit.DAYS);

            subscriptionId = activateSubscription(request, start, end);
        } else if (note == null || note.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Cần nhập rõ lý do từ chối để thông báo cho người dùng.");
        }

        reviewRequest(id, adminId, approve ? "APPROVED" : "REJECTED", note, subscriptionId);
    }

    /**
     * [BF-01][UC-13] Lấy danh sách toàn bộ lịch sử thanh toán & biên lai giao dịch của người dùng.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTransactions(long userId) {
        String sql = """
                SELECT t.transaction_id AS id,
                       t.txn_ref AS txnRef,
                       t.transaction_type AS transactionType,
                       t.amount,
                       t.currency,
                       t.payment_gateway AS paymentGateway,
                       t.status,
                       t.paid_at AS paidAt,
                       t.subscription_id AS subscriptionId,
                       s.package_id AS packageId,
                       s.package_name_snapshot AS packageName,
                       s.package_code_snapshot AS packageCode,
                       s.duration_days_snapshot AS durationDays,
                       s.start_at AS startAt,
                       s.end_at AS endAt,
                       u.full_name AS fullName,
                       u.username,
                       u.email
                FROM transactions t
                JOIN users u ON u.user_id = t.user_id
                LEFT JOIN subscriptions s ON s.subscription_id = t.subscription_id
                WHERE t.user_id = ?
                ORDER BY t.paid_at DESC, t.transaction_id DESC
                """;
        return jdbc.queryForList(sql, userId);
    }

    /**
     * [BF-01][UC-13] Xem chi tiết một biên lai giao dịch cụ thể theo ID.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTransactionDetail(long userId, long transactionId) {
        String sql = """
                SELECT t.transaction_id AS id,
                       t.txn_ref AS txnRef,
                       t.transaction_type AS transactionType,
                       t.amount,
                       t.currency,
                       t.payment_gateway AS paymentGateway,
                       t.status,
                       t.paid_at AS paidAt,
                       t.subscription_id AS subscriptionId,
                       s.package_id AS packageId,
                       s.package_name_snapshot AS packageName,
                       s.package_code_snapshot AS packageCode,
                       s.duration_days_snapshot AS durationDays,
                       s.start_at AS startAt,
                       s.end_at AS endAt,
                       u.full_name AS fullName,
                       u.username,
                       u.email
                FROM transactions t
                JOIN users u ON u.user_id = t.user_id
                LEFT JOIN subscriptions s ON s.subscription_id = t.subscription_id
                WHERE t.user_id = ? AND t.transaction_id = ?
                """;
        List<Map<String, Object>> list = jdbc.queryForList(sql, userId, transactionId);
        return list.stream().findFirst().orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy biên lai giao dịch."));
    }

    // =========================================================================
    // 3. CÁC HÀM TRUY VẤN DB NỘI BỘ (TÍCH HỢP TRỰC TIẾP TỪ REPOSITORY)
    // =========================================================================

    public List<Subscription> subscriptions(long userId) {
        return jdbc.query("""
                SELECT subscription_id, package_id, package_name_snapshot, start_at, end_at, status,
                    (status='ACTIVE' AND start_at<=CURRENT_TIMESTAMP(6) AND end_at>CURRENT_TIMESTAMP(6)) AS current_access
                FROM subscriptions WHERE user_id=? ORDER BY end_at DESC LIMIT 100
                """, (rs, n) -> new Subscription(
                        rs.getLong("subscription_id"),
                        rs.getLong("package_id"),
                        rs.getString("package_name_snapshot"),
                        rs.getTimestamp("start_at").toInstant(),
                        rs.getTimestamp("end_at").toInstant(),
                        rs.getString("status"),
                        rs.getBoolean("current_access")
                ), userId);
    }

    public boolean lockActiveUser(long id) {
        return !jdbc.queryForList("SELECT user_id FROM users WHERE user_id=? AND status='ACTIVE' FOR UPDATE", Long.class, id).isEmpty();
    }

    public Optional<Plan> activePlan(long id) {
        return jdbc.query("SELECT * FROM subscription_packages WHERE package_id=? AND status='ACTIVE'",
                (rs, n) -> new Plan(
                        rs.getLong("package_id"),
                        rs.getString("code"),
                        rs.getString("name"),
                        rs.getBigDecimal("price"),
                        rs.getString("currency"),
                        rs.getInt("duration_days")
                ), id).stream().findFirst();
    }

    public Optional<Request> pending(long userId) {
        return requests("SELECT * FROM premium_requests WHERE user_id=? AND status='PENDING'", userId).stream().findFirst();
    }

    public Optional<Request> lockRequest(long id) {
        return requests("SELECT * FROM premium_requests WHERE request_id=? FOR UPDATE", id).stream().findFirst();
    }

    private List<Request> requests(String sql, long id) {
        return jdbc.query(sql, (rs, n) -> new Request(
                rs.getLong("request_id"),
                rs.getLong("user_id"),
                new Plan(
                        rs.getLong("package_id"),
                        rs.getString("package_code"),
                        rs.getString("package_name"),
                        rs.getBigDecimal("amount"),
                        rs.getString("currency"),
                        rs.getInt("duration_days")
                ),
                rs.getString("status")
        ), id);
    }

    public long createRequest(long userId, Plan plan) {
        long requestId = insert("""
                INSERT INTO premium_requests(user_id, package_id, package_code, package_name, amount, currency, duration_days)
                VALUES (?,?,?,?,?,?,?)
                """, userId, plan.id(), plan.code(), plan.name(), plan.amount(), plan.currency(), plan.days());

        jdbc.update("""
            INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
            VALUES (?, ?, ?, 'PREMIUM', 'PREMIUM_REQUEST', ?, 'SENT', CURRENT_TIMESTAMP(6))
            """, userId, "Đã nhận yêu cầu đăng ký Premium",
                "Yêu cầu cho gói " + plan.name() + " đang chờ admin kiểm tra thanh toán. Chưa được cấp quyền; không chuyển tiền lại nếu đã thanh toán.",
                String.valueOf(requestId));

        jdbc.update("""
            INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
            SELECT DISTINCT u.user_id, ?, ?, 'PREMIUM', 'PREMIUM_REQUEST', ?, 'SENT', CURRENT_TIMESTAMP(6)
            FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id
            WHERE r.role_name='ADMINISTRATOR' AND r.status='ACTIVE' AND u.status='ACTIVE'
            """, "Có yêu cầu Premium cần kiểm tra",
                "Yêu cầu #" + requestId + " · " + plan.name() + ". Hãy xác minh tiền đã nhận trước khi duyệt.",
                String.valueOf(requestId));

        return requestId;
    }

    public Instant latestExpiry(long userId) {
        Timestamp end = jdbc.queryForObject("SELECT MAX(end_at) FROM subscriptions WHERE user_id=? AND status='ACTIVE'", Timestamp.class, userId);
        return end == null ? null : end.toInstant();
    }

    public long activateSubscription(Request request, Instant start, Instant end) {
        Plan p = request.plan();
        long subscription = insert("""
                INSERT INTO subscriptions(user_id, package_id, package_code_snapshot, package_name_snapshot,
                    price_snapshot, currency, duration_days_snapshot, start_at, end_at, status)
                VALUES (?,?,?,?,?,?,?,?,?,'ACTIVE')
                """, request.userId(), p.id(), p.code(), p.name(), p.amount(), p.currency(), p.days(), Timestamp.from(start), Timestamp.from(end));

        String transactionType = start.isAfter(Instant.now()) ? "PREMIUM_RENEWAL" : "PREMIUM_PURCHASE";
        jdbc.update("""
                INSERT INTO transactions(txn_ref, transaction_type, user_id, subscription_id, amount, currency, payment_gateway, status, paid_at)
                VALUES (?,?,?,?,?,?,'MANUAL','SUCCESS',CURRENT_TIMESTAMP(6))
                """, "MANUAL-PREMIUM-" + request.id(), transactionType, request.userId(), subscription, p.amount(), p.currency());

        jdbc.update("""
                INSERT IGNORE INTO user_roles(user_id, role_id)
                SELECT ?, role_id FROM roles WHERE role_name='SUBSCRIBER' AND status='ACTIVE'
                """, request.userId());

        return subscription;
    }

    public void cancelRequest(long id, String note) {
        jdbc.update("""
                UPDATE premium_requests
                SET status = 'REJECTED', review_note = ?, reviewed_at = CURRENT_TIMESTAMP(6)
                WHERE request_id = ? AND status = 'PENDING'
                """, note, id);
    }

    public void reviewRequest(long id, long adminId, String status, String note, Long subscription) {
        jdbc.update("""
                UPDATE premium_requests SET status=?, reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP(6), review_note=?, subscription_id=?
                WHERE request_id=? AND status='PENDING'
                """, status, adminId, note, subscription, id);

        jdbc.update("""
            INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
            SELECT user_id, ?, ?, 'PREMIUM', 'PREMIUM_REQUEST', ?, 'SENT', CURRENT_TIMESTAMP(6)
            FROM premium_requests WHERE request_id=?
            """, "APPROVED".equals(status) ? "Gói Premium đã được duyệt" : "Yêu cầu Premium chưa được duyệt",
                "APPROVED".equals(status)
                        ? "Admin đã xác minh yêu cầu. Mở gói của tôi để xem thời gian có hiệu lực và các quyền lợi."
                        : "Admin đã từ chối yêu cầu. Mở lịch sử đăng ký để xem lý do trước khi gửi lại.",
                String.valueOf(id), id);
    }

    private long insert(String sql, Object... values) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
