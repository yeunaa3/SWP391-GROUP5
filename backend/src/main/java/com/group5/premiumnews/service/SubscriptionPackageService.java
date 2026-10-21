package com.group5.premiumnews.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubscriptionPackageService {

    private final JdbcTemplate jdbc;

    public SubscriptionPackageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

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
    public Map<String, Object> create(PackagePayload payload) {
        if (payload.code() == null || payload.code().isBlank() || payload.name() == null || payload.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã gói và tên gói không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
        }

        // Check unique code
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM subscription_packages WHERE code = ?", Integer.class, payload.code());
        if (count != null && count > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã gói cước '" + payload.code() + "' đã tồn tại.");
        }

        String status = (payload.status() != null && !payload.status().isBlank()) ? payload.status() : "ACTIVE";
        String currency = (payload.currency() != null && !payload.currency().isBlank()) ? payload.currency() : "VND";

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

        return Map.of("message", "Tạo gói cước mới thành công", "code", payload.code());
    }

    @Transactional
    public Map<String, Object> update(long id, PackagePayload payload) {
        if (payload.name() == null || payload.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên gói cước không được để trống.");
        }
        if (payload.price() == null || payload.price().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá gói cước không hợp lệ.");
        }
        if (payload.durationDays() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thời hạn gói cước phải lớn hơn 0 ngày.");
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
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        return Map.of("message", "Cập nhật thông tin gói cước thành công", "id", id);
    }

    @Transactional
    public Map<String, Object> toggleStatus(long id) {
        String currentStatus = jdbc.queryForObject("SELECT status FROM subscription_packages WHERE package_id = ?", String.class, id);
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }

        String nextStatus = "ACTIVE".equalsIgnoreCase(currentStatus) ? "INACTIVE" : "ACTIVE";
        jdbc.update("UPDATE subscription_packages SET status = ?, updated_at = CURRENT_TIMESTAMP(6) WHERE package_id = ?", nextStatus, id);

        return Map.of("message", "Đã đổi trạng thái gói sang " + nextStatus, "status", nextStatus);
    }

    @Transactional
    public void delete(long id) {
        // Soft delete to protect foreign keys in existing subscriptions
        int updated = jdbc.update("UPDATE subscription_packages SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP(6) WHERE package_id = ?", id);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói cước với ID " + id);
        }
    }
}
