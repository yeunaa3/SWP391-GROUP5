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
public class AdSlotAdminService {
    private final JdbcTemplate jdbc;

    public record SlotInput(
            String positionCode,
            String name,
            String pageScope,
            Integer width,
            Integer height,
            BigDecimal basePrice,
            String status,
            String updatedAt) {
    }

    public AdSlotAdminService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        return jdbc.queryForList("""
                SELECT s.slot_id AS id,
                       s.position_code AS positionCode,
                       s.slot_name AS name,
                       s.page_scope AS pageScope,
                       s.width_px AS width,
                       s.height_px AS height,
                       s.base_price AS basePrice,
                       s.currency AS currency,
                       s.status AS status,
                       DATE_FORMAT(s.updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updatedAt,
                       (
                           SELECT COUNT(*)
                           FROM contracts ct
                           WHERE ct.slot_id = s.slot_id
                             AND ct.end_at > CURRENT_TIMESTAMP(6)
                             AND (
                                 ct.status IN ('PROPOSED', 'ACCEPTED', 'PENDING_PAYMENT', 'ACTIVE')
                                 OR EXISTS (
                                     SELECT 1
                                     FROM ad_campaigns c
                                     WHERE c.contract_id = ct.contract_id
                                       AND c.status = 'ACTIVE'
                                       AND c.scheduled_end_time > CURRENT_TIMESTAMP(6)
                                 )
                             )
                       ) AS activeUsageCount
                FROM ad_slots s
                ORDER BY s.slot_id
                """);
    }

    @Transactional
    public Map<String, Object> create(SlotInput input) {
        validate(input, false);
        ensureUniquePosition(input.positionCode(), null);

        try {
            jdbc.update("""
                    INSERT INTO ad_slots
                        (position_code, slot_name, page_scope, width_px, height_px,
                         base_price, currency, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'VND', ?)
                    """,
                    input.positionCode().trim().toUpperCase(),
                    input.name().trim(),
                    input.pageScope().trim(),
                    input.width(),
                    input.height(),
                    input.basePrice(),
                    input.status());

            Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            return Map.of("id", id, "message", "Đã tạo vị trí quảng cáo.");
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã vị trí đã tồn tại. Hãy chọn mã khác.");
        }
    }

    @Transactional
    public Map<String, Object> update(long id, SlotInput input) {
        validate(input, true);

        String savedVersion = jdbc.query("""
                SELECT DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updatedAt
                FROM ad_slots
                WHERE slot_id=?
                FOR UPDATE
                """,
                rs -> rs.next() ? rs.getString("updatedAt") : null,
                id);

        if (savedVersion == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Không tìm thấy vị trí quảng cáo.");
        }

        if (!savedVersion.equals(input.updatedAt())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Vị trí đã được thay đổi. Hãy tải lại danh sách trước khi lưu.");
        }

        ensureUniquePosition(input.positionCode(), id);

        if ("INACTIVE".equals(input.status()) && activeUsageCount(id) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể tắt slot đang được booking hoặc chiến dịch sử dụng. Hãy xử lý dữ liệu đang chạy trước.");
        }

        try {
            jdbc.update("""
                    UPDATE ad_slots
                    SET position_code=?, slot_name=?, page_scope=?, width_px=?, height_px=?,
                        base_price=?, status=?, updated_at=CURRENT_TIMESTAMP(6)
                    WHERE slot_id=?
                    """,
                    input.positionCode().trim().toUpperCase(),
                    input.name().trim(),
                    input.pageScope().trim(),
                    input.width(),
                    input.height(),
                    input.basePrice(),
                    input.status(),
                    id);

            return Map.of("id", id, "message", "Đã lưu thay đổi vị trí quảng cáo.");
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã vị trí đã tồn tại. Hãy chọn mã khác.");
        }
    }

    private void validate(SlotInput input, boolean updating) {
        if (input == null
                || input.positionCode() == null
                || !Pattern.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,49}", input.positionCode().trim())
                || input.name() == null || input.name().isBlank() || input.name().trim().length() > 100
                || input.pageScope() == null || input.pageScope().isBlank() || input.pageScope().trim().length() > 50
                || input.width() == null || input.width() < 1
                || input.height() == null || input.height() < 1
                || input.basePrice() == null || input.basePrice().signum() < 0
                || !List.of("ACTIVE", "INACTIVE").contains(input.status())
                || (updating && (input.updatedAt() == null || input.updatedAt().isBlank()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Thông tin slot chưa hợp lệ. Hãy kiểm tra các trường và thử lại.");
        }
    }

    private void ensureUniquePosition(String positionCode, Long excludingId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM ad_slots
                WHERE position_code=? AND (? IS NULL OR slot_id<>?)
                """,
                Integer.class,
                positionCode.trim().toUpperCase(),
                excludingId,
                excludingId);

        if (count != null && count > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Mã vị trí đã tồn tại. Hãy chọn mã khác.");
        }
    }

    private int activeUsageCount(long id) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM contracts ct
                WHERE ct.slot_id=?
                  AND ct.end_at>CURRENT_TIMESTAMP(6)
                  AND (
                      ct.status IN ('PROPOSED','ACCEPTED','PENDING_PAYMENT','ACTIVE')
                      OR EXISTS (
                          SELECT 1 FROM ad_campaigns c
                          WHERE c.contract_id=ct.contract_id
                            AND c.status='ACTIVE'
                            AND c.scheduled_end_time>CURRENT_TIMESTAMP(6)
                      )
                  )
                """,
                Integer.class,
                id);

        return count == null ? 0 : count;
    }
}