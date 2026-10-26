package com.group5.premiumnews.service;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class B2bPackageAdminService {
    private final JdbcTemplate jdbc;

    public record PackageInput(
            String code,
            String name,
            BigDecimal price,
            Integer durationDays,
            Long impressionsQuota,
            String description,
            String status,
            String updatedAt) {
    }

    public B2bPackageAdminService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        return jdbc.queryForList("""
                SELECT p.b2b_package_id AS id,
                       p.code,
                       p.name,
                       p.price,
                       p.currency,
                       p.duration_days AS durationDays,
                       p.impressions_quota AS impressionsQuota,
                       p.description,
                       p.status,
                       DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updatedAt,
                       (
                           SELECT COUNT(*)
                           FROM contracts ct
                           WHERE ct.b2b_package_id = p.b2b_package_id
                             AND ct.status = 'ACTIVE'
                             AND ct.payment_status = 'PAID'
                             AND ct.end_at > CURRENT_TIMESTAMP(6)
                       ) AS activeContractCount
                FROM b2b_packages p
                ORDER BY p.price ASC, p.b2b_package_id ASC
                """);
    }

    @Transactional
    public Map<String, Object> create(PackageInput input) {
        validate(input, false);
        ensureUniqueCode(input.code(), null);

        try {
            jdbc.update("""
                    INSERT INTO b2b_packages
                        (code, name, price, currency, duration_days,
                         impressions_quota, description, status)
                    VALUES (?, ?, ?, 'VND', ?, ?, ?, ?)
                    """,
                    input.code().trim().toUpperCase(),
                    input.name().trim(),
                    input.price(),
                    input.durationDays(),
                    input.impressionsQuota(),
                    input.description() == null ? "" : input.description().trim(),
                    input.status());

            Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            return Map.of("id", id, "message", "Đã tạo gói quảng cáo B2B.");
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã gói đã tồn tại. Hãy chọn mã khác.");
        }
    }

    @Transactional
    public Map<String, Object> update(long id, PackageInput input) {
        validate(input, true);

        String savedVersion = jdbc.query("""
                SELECT DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updatedAt
                FROM b2b_packages
                WHERE b2b_package_id=?
                FOR UPDATE
                """,
                rs -> rs.next() ? rs.getString("updatedAt") : null,
                id);

        if (savedVersion == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Không tìm thấy gói quảng cáo.");
        }

        if (!savedVersion.equals(input.updatedAt())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Gói đã được thay đổi. Hãy tải lại danh sách trước khi lưu.");
        }

        ensureUniqueCode(input.code(), id);

        try {
            jdbc.update("""
                    UPDATE b2b_packages
                    SET code=?, name=?, price=?, currency='VND', duration_days=?,
                        impressions_quota=?, description=?, status=?,
                        updated_at=CURRENT_TIMESTAMP(6)
                    WHERE b2b_package_id=?
                    """,
                    input.code().trim().toUpperCase(),
                    input.name().trim(),
                    input.price(),
                    input.durationDays(),
                    input.impressionsQuota(),
                    input.description() == null ? "" : input.description().trim(),
                    input.status(),
                    id);

            return Map.of("id", id, "message", "Đã lưu thay đổi gói quảng cáo.");
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã gói đã tồn tại. Hãy chọn mã khác.");
        }
    }

    private void validate(PackageInput input, boolean updating) {
        if (input == null
                || input.code() == null
                || !Pattern.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,49}", input.code().trim())
                || input.name() == null || input.name().isBlank() || input.name().trim().length() > 100
                || input.price() == null || input.price().signum() < 0
                || input.price().scale() > 2
                || input.price().precision() - input.price().scale() > 16
                || input.durationDays() == null || input.durationDays() < 1
                || input.impressionsQuota() == null || input.impressionsQuota() < 1
                || (input.description() != null && input.description().length() > 4000)
                || input.status() == null
                || !List.of("DRAFT", "ACTIVE", "INACTIVE").contains(input.status())
                || (updating && (input.updatedAt() == null || input.updatedAt().isBlank()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thông tin gói chưa hợp lệ. Hãy kiểm tra các trường và thử lại.");
        }
    }

    private void ensureUniqueCode(String code, Long excludingId) {
        Integer count;

        if (excludingId == null) {
            count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM b2b_packages WHERE code=?",
                    Integer.class,
                    code.trim().toUpperCase());
        } else {
            count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM b2b_packages WHERE code=? AND b2b_package_id<>?",
                    Integer.class,
                    code.trim().toUpperCase(),
                    excludingId);
        }

        if (count != null && count > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã gói đã tồn tại. Hãy chọn mã khác.");
        }
    }
}