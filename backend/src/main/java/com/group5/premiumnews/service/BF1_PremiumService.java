package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.BF1_PremiumRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * ============================================================================
 * [BF-01] LUỒNG 1: QUY TRÌNH THUÊ BAO PREMIUM, QUẢN LÝ GÓI & DUYỆT ĐƠN (SERVICE XỬ LÝ)
 * Phụ trách: Cường
 * 
 * Các Use Case xử lý:
 * - [UC-35][CFG-05] Quản trị viên quản lý danh mục gói cước (Thêm, Sửa, Bật/Tắt, Xóa thông minh Smart Delete)
 * - [UC-11] Đăng ký gói cước mới (chuyển khoản ngân hàng / QR VietQR), chống spam submit
 * - [UC-12] Kiểm tra quyền hạn đọc báo không quảng cáo (Access Check)
 * - [UC-13] Lịch sử biên lai thanh toán & chi tiết hóa đơn
 * - [UC-14] Admin đối soát sao kê và duyệt/từ chối kích hoạt (cộng dồn hạn nối tiếp)
 * - [Swimlane Cancel] Hủy đơn chờ thanh toán khi muốn đổi gói
 * ============================================================================
 */
@Service
public class BF1_PremiumService {

    private final BF1_PremiumRepository repository;

    public BF1_PremiumService(BF1_PremiumRepository repository) {
        this.repository = repository;
    }

    // =========================================================================
    // 1. QUẢN LÝ DANH MỤC GÓI CƯỚC PREMIUM (UC-35)
    // =========================================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAdminPackages() {
        return repository.listAdminPackages();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublicPackages() {
        return repository.listPublicPackages();
    }

    @Transactional
    public Map<String, Object> createPackage(BF1_PremiumRepository.PackagePayload payload) {
        if (payload.code() == null || payload.code().isBlank() || payload.name() == null || payload.name().isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Mã gói và tên gói không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw error(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw error(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
        }

        Integer count = repository.countPackageCode(payload.code().trim());
        if (count != null && count > 0) {
            throw error(HttpStatus.CONFLICT, "Mã gói cước '" + payload.code().trim().toUpperCase() + "' đã tồn tại.");
        }

        String currency = (payload.currency() != null && !payload.currency().isBlank()) ? payload.currency().trim().toUpperCase() : "VND";
        String status = (payload.status() != null && !payload.status().isBlank()) ? payload.status().trim().toUpperCase() : "ACTIVE";

        repository.createPackage(payload, status, currency);
        return Map.of("message", "Tạo gói cước mới thành công", "code", payload.code().trim().toUpperCase());
    }

    @Transactional
    public Map<String, Object> updatePackage(long id, BF1_PremiumRepository.PackagePayload payload) {
        if (payload.name() == null || payload.name().isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Tên gói cước không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw error(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw error(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
        }

        int updated = repository.updatePackage(id, payload);
        if (updated == 0) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        return Map.of("message", "Cập nhật thông tin gói cước thành công", "id", id);
    }

    @Transactional
    public Map<String, Object> togglePackageStatus(long id) {
        String currentStatus = repository.getPackageStatus(id);
        if (currentStatus == null) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        String nextStatus = "ACTIVE".equalsIgnoreCase(currentStatus) ? "INACTIVE" : "ACTIVE";
        repository.updatePackageStatus(id, nextStatus);

        return Map.of("message", "Đã đổi trạng thái gói sang " + nextStatus, "status", nextStatus);
    }

    /**
     * [BF-01][Smart Delete] Xóa thông minh gói cước:
     * - Nếu gói test chưa có ai mua: Xóa hẳn khỏi Database (DELETE).
     * - Nếu gói đã có lịch sử thuê bao: Chuyển sang Tạm ẩn (INACTIVE) để bảo toàn khóa ngoại ON DELETE RESTRICT.
     */
    @Transactional
    public Map<String, Object> deletePackage(long id) {
        Map<String, Object> result = repository.deletePackage(id);
        if (result == null) {
            throw error(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }
        return result;
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
        if (!repository.lockActiveUser(userId)) {
            throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
        }

        var pending = repository.pending(userId);
        if (pending.isPresent()) {
            if (pending.get().plan().id() != packageId) {
                // Tự động hủy đơn PENDING cũ để chuyển sang gói mới mà không bắt user chờ
                repository.cancel(pending.get().id(), "Đã tự động hủy để chuyển sang gói cước mới");
            } else {
                return Map.of("id", pending.get().id(), "status", "PENDING");
            }
        }

        var plan = repository.activePlan(packageId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói cước không còn mở bán."));

        long requestId = repository.create(userId, plan);
        return Map.of("id", requestId, "status", "PENDING");
    }

    /**
     * [BF-01][Swimlane Cancel] Người đọc chủ động hủy yêu cầu thanh toán đang PENDING.
     */
    @Transactional
    public Map<String, Object> cancel(long userId, long requestId) {
        var req = repository.lockRequest(requestId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu Premium ID: " + requestId));
        if (req.userId() != userId) {
            throw error(HttpStatus.FORBIDDEN, "Bạn không có quyền thao tác trên yêu cầu này.");
        }
        if (!"PENDING".equals(req.status())) {
            throw error(HttpStatus.CONFLICT, "Chỉ có thể hủy yêu cầu đang ở trạng thái chờ thanh toán (PENDING).");
        }
        repository.cancel(requestId, "Đã hủy bởi người dùng để đổi gói");
        return Map.of("success", true, "message", "Đã hủy yêu cầu thanh toán thành công.", "requestId", requestId);
    }

    /**
     * [BF-01][UC-11] Lấy danh sách yêu cầu đăng ký gói cước của một người dùng (hoặc toàn bộ cho Admin).
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long userId) {
        return repository.list(userId);
    }

    /**
     * [BF-01][UC-12][Subscription Check] Kiểm tra trạng thái bản quyền Premium của người đọc.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> access(long userId) {
        var subscriptions = repository.subscriptions(userId);
        var pending = repository.pending(userId);
        boolean isActive = subscriptions.stream().anyMatch(BF1_PremiumRepository.Subscription::current);

        return Map.of(
                "active", isActive,
                "subscriptions", subscriptions,
                "pendingPackageId", pending.map(r -> r.plan().id()).orElse(0L)
        );
    }

    /**
     * [BF-01][UC-14][PRE-04] Quản trị viên đối soát sao kê ngân hàng và phê duyệt kích hoạt gói.
     */
    @Transactional
    public void review(long adminId, long id, boolean approve, boolean paymentConfirmed, String note) {
        var request = repository.lockRequest(id)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu nâng cấp gói."));

        if (!"PENDING".equals(request.status())) {
            throw error(HttpStatus.CONFLICT, "Yêu cầu đã được xử lý trước đó. Không thể thao tác lại.");
        }
        if (!repository.lockActiveUser(request.userId())) {
            throw error(HttpStatus.CONFLICT, "Tài khoản người mua hiện không ở trạng thái hoạt động.");
        }

        Long subscriptionId = null;
        if (approve) {
            if (!paymentConfirmed) {
                throw error(HttpStatus.BAD_REQUEST, "Admin phải xác nhận đã kiểm tra tiền về tài khoản trước khi duyệt.");
            }
            Instant now = Instant.now();
            Instant previousEnd = repository.latestExpiry(request.userId());
            // Nếu người dùng đang còn hạn, cộng dồn ngày bắt đầu nối tiếp hạn cũ
            Instant start = (previousEnd != null && previousEnd.isAfter(now)) ? previousEnd : now;
            Instant end = start.plus(request.plan().days(), ChronoUnit.DAYS);

            subscriptionId = repository.activate(request, start, end);
        } else if (note == null || note.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Cần nhập rõ lý do từ chối để thông báo cho người dùng.");
        }

        repository.review(id, adminId, approve ? "APPROVED" : "REJECTED", note, subscriptionId);
    }

    /**
     * [BF-01][UC-13] Lấy danh sách toàn bộ lịch sử thanh toán & biên lai giao dịch của người dùng.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listTransactions(long userId) {
        return repository.transactions(userId);
    }

    /**
     * [BF-01][UC-13] Xem chi tiết một biên lai giao dịch cụ thể theo ID.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTransactionDetail(long userId, long transactionId) {
        return repository.transactionDetail(userId, transactionId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy biên lai giao dịch."));
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
