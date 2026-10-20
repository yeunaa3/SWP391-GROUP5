package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.PremiumRequestRepository;
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
 * [BF-01] MANUAL PREMIUM SUBSCRIPTION & PAYMENT VERIFICATION SERVICE
 * Phụ trách: Cường (Quy trình thuê bao Premium, thanh toán chuyển khoản & phê duyệt)
 * 
 * Các Use Case liên quan:
 * - [UC-11] Người đọc gửi yêu cầu đăng ký gói cước Premium qua chuyển khoản ngân hàng / QR code
 * - [UC-12] Kiểm tra trạng thái thuê bao còn hạn (Active Subscription) & phân quyền đọc không quảng cáo
 * - [UC-13] Tra cứu lịch sử thanh toán, xem chi tiết biên lai giao dịch của người dùng
 * - [UC-14] Quản trị viên đối soát giao dịch ngân hàng và phê duyệt kích hoạt gói
 * ============================================================================
 */
@Service
public class ManualPremiumService {

    private final PremiumRequestRepository repository;

    public ManualPremiumService(PremiumRequestRepository repository) {
        this.repository = repository;
    }

    /**
     * [BF-01][UC-11][PRE-04] Người đọc gửi yêu cầu mua gói Premium mới.
     * Khóa dòng tài khoản để tránh gửi trùng lặp, kiểm tra nếu đã có yêu cầu PENDING thì không tạo thêm.
     *
     * @param userId ID người đọc
     * @param packageId ID gói cước Premium được chọn
     * @return Map chứa id yêu cầu và trạng thái PENDING
     */
    @Transactional
    public Map<String, Object> submit(long userId, long packageId) {
        if (!repository.lockActiveUser(userId)) {
            throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
        }

        var pending = repository.pending(userId);
        if (pending.isPresent()) {
            if (pending.get().plan().id() != packageId) {
                throw error(HttpStatus.CONFLICT, "Bạn đã có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi đổi gói.");
            }
            return Map.of("id", pending.get().id(), "status", "PENDING");
        }

        var plan = repository.activePlan(packageId)
                .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói cước không còn mở bán."));

        long requestId = repository.create(userId, plan);
        return Map.of("id", requestId, "status", "PENDING");
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
     * Xác định xem người dùng có thuê bao ACTIVE còn hiệu lực hay không để cấp quyền Đọc sạch không quảng cáo.
     *
     * @param userId ID người đọc
     * @return Map chứa cờ active (true/false), danh sách subscriptions, và gói đang chờ duyệt (nếu có)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> access(long userId) {
        var subscriptions = repository.subscriptions(userId);
        var pending = repository.pending(userId);
        boolean isActive = subscriptions.stream().anyMatch(PremiumRequestRepository.Subscription::current);

        return Map.of(
                "active", isActive,
                "subscriptions", subscriptions,
                "pendingPackageId", pending.map(r -> r.plan().id()).orElse(0L)
        );
    }

    /**
     * [BF-01][UC-14][PRE-04] Quản trị viên đối soát sao kê ngân hàng và phê duyệt kích hoạt gói.
     * Nếu duyệt (approve = true):
     * 1. Bắt buộc admin phải đánh dấu paymentConfirmed = true.
     * 2. Tự động tính ngày bắt đầu và kết thúc (nối tiếp hạn cũ nếu đang có gói còn hạn).
     * 3. Kích hoạt vai trò SUBSCRIBER và lưu nhật ký kiểm toán.
     *
     * @param adminId ID quản trị viên duyệt
     * @param id ID yêu cầu mua gói
     * @param approve true nếu chấp thuận kích hoạt, false nếu từ chối
     * @param paymentConfirmed Xác nhận đã nhận được tiền trong tài khoản ngân hàng
     * @param note Lý do từ chối hoặc ghi chú nghiệp vụ
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
