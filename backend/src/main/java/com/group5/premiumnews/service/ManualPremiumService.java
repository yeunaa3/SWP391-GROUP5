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

@Service
public class ManualPremiumService {
    private final PremiumRequestRepository repository;
    public ManualPremiumService(PremiumRequestRepository repository) { this.repository = repository; }

    @Transactional
    public Map<String, Object> submit(long userId, long packageId) {
        if (!repository.lockActiveUser(userId)) throw error(HttpStatus.FORBIDDEN, "Tài khoản không hoạt động.");
        var pending = repository.pending(userId);
        if (pending.isPresent()) {
            if (pending.get().plan().id() != packageId) throw error(HttpStatus.CONFLICT, "Bạn đã có yêu cầu chờ duyệt. Vui lòng đợi admin xử lý trước khi đổi gói.");
            return Map.of("id", pending.get().id(), "status", "PENDING");
        }
        var plan = repository.activePlan(packageId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Gói không còn mở bán."));
        return Map.of("id", repository.create(userId, plan), "status", "PENDING");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Long userId) { return repository.list(userId); }

    @Transactional(readOnly = true)
    public Map<String, Object> access(long userId) {
        var subscriptions = repository.subscriptions(userId);
        var pending = repository.pending(userId);
        return Map.of("active", subscriptions.stream().anyMatch(PremiumRequestRepository.Subscription::current),
                "subscriptions", subscriptions,
                "pendingPackageId", pending.map(r -> r.plan().id()).orElse(0L));
    }

    @Transactional
    public void review(long adminId, long id, boolean approve, boolean paymentConfirmed, String note) {
        var request = repository.lockRequest(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu."));
        if (!"PENDING".equals(request.status())) throw error(HttpStatus.CONFLICT, "Yêu cầu đã được xử lý. Không kích hoạt lại.");
        if (!repository.lockActiveUser(request.userId())) throw error(HttpStatus.CONFLICT, "Tài khoản người mua không hoạt động.");
        Long subscription = null;
        if (approve) {
            if (!paymentConfirmed) throw error(HttpStatus.BAD_REQUEST, "Admin phải xác nhận đã kiểm tra thanh toán trước khi duyệt.");
            Instant now = Instant.now();
            Instant previousEnd = repository.latestExpiry(request.userId());
            Instant start = previousEnd != null && previousEnd.isAfter(now) ? previousEnd : now;
            subscription = repository.activate(request, start, start.plus(request.plan().days(), ChronoUnit.DAYS));
        } else if (note == null || note.isBlank()) {
            throw error(HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối.");
        }
        repository.review(id, adminId, approve ? "APPROVED" : "REJECTED", note, subscription);
    }

    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
