package com.group5.premiumnews.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * [BF-08] LUỒNG 8: PHÂN PHỐI QUẢNG CÁO & CHỐNG GIAN LẬN CLICK TẶC (SERVICE XỬ LÝ)
 * Phụ trách: Cường
 * 
 * Các Use Case liên quan:
 * - [UC-31] Matching Engine phân phối banner quảng cáo thời gian thực theo context (vị trí, thiết bị, quốc gia, chuyên mục)
 * - [UC-31] Ghi nhận Impression khi đạt chuẩn IAB (50% diện tích nhìn thấy trong >= 1s)
 * - [UC-31] Ghi nhận Click & Cơ chế chống click tặc Anti-fraud (cửa sổ 2s SHA-256 fingerprint, RAPID_CLICK_DUPLICATE)
 * - [UC-32] Tra cứu slot đã đặt chỗ (availability)
 * ============================================================================
 */
@Service
public class BF8_AdServingService {

    private final JdbcTemplate jdbc;

    public BF8_AdServingService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * [BF-08][UC-32] Kiểm tra các khoảng thời gian vị trí quảng cáo đã được đặt chỗ hoặc đang chạy.
     * Sử dụng để tránh xung đột lịch phân phối giữa các hợp đồng quảng cáo.
     *
     * @return Danh sách các slot và khoảng thời gian (startAt, endAt) đã kín lịch
     */
    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> availability() {
        return jdbc.queryForList("""
            SELECT 
                slot_id AS slotId, 
                start_at AS startAt, 
                end_at AS endAt
            FROM contracts 
            WHERE end_at > CURRENT_TIMESTAMP
              AND (
                  (status = 'ACTIVE' AND payment_status = 'PAID')
                  OR (status IN ('ACCEPTED', 'PENDING_PAYMENT') AND reservation_expires_at > CURRENT_TIMESTAMP)
              )
            ORDER BY start_at
            """);
    }

    /** Lịch Ad Manager cần cả booking chờ xét duyệt và proposal đang chờ Business phản hồi. */
    public List<Map<String, Object>> bookingReviewAvailability(long excludeContractId) {
        return jdbc.queryForList("""
            SELECT ct.slot_id AS slotId, ct.start_at AS startAt, ct.end_at AS endAt
            FROM contracts ct
            WHERE ct.contract_id<>?
              AND ct.status='PENDING_REVIEW'
              AND ct.end_at>CURRENT_TIMESTAMP(6)
            UNION ALL
            SELECT cp.proposed_slot_id AS slotId,
                   cp.proposed_start_at AS startAt,
                   cp.proposed_end_at AS endAt
            FROM contracts ct
            JOIN contract_proposals cp ON cp.contract_id=ct.contract_id
            WHERE ct.contract_id<>?
              AND ct.status='PROPOSED'
              AND cp.status='SENT'
              AND cp.expires_at>CURRENT_TIMESTAMP(6)
              AND cp.proposed_end_at>CURRENT_TIMESTAMP(6)
            UNION ALL
            SELECT ct.slot_id AS slotId, ct.start_at AS startAt, ct.end_at AS endAt
            FROM contracts ct
            WHERE ct.contract_id<>?
              AND ct.end_at>CURRENT_TIMESTAMP(6)
              AND (
                  (ct.status='ACTIVE' AND ct.payment_status='PAID')
                  OR (ct.status IN ('ACCEPTED','PENDING_PAYMENT')
                      AND ct.reservation_expires_at>CURRENT_TIMESTAMP(6))
              )
            ORDER BY startAt
            """, excludeContractId, excludeContractId, excludeContractId);
    }

    /**
     * [BF-08][UC-31] ĐỘNG CƠ PHÂN PHỐI QUẢNG CÁO THỜI GIAN THỰC (Real-time Ad Matching Engine).
     * Chọn creative đủ điều kiện theo lịch, partnership, quota và context nội dung/thiết bị/vùng trình duyệt.
     *
     * @param position Vị trí slot quảng cáo (HOME_HERO, ARTICLE_TOP, IN_ARTICLE, ARTICLE_SIDEBAR)
     * @param device Thiết bị người dùng (DESKTOP, MOBILE, TABLET)
     * @param country Mã quốc gia ngôn ngữ trình duyệt
     * @param article ID bài báo đang đọc (nếu có)
     * @return Danh sách tối đa 3 banner phù hợp nhất
     */
    public List<Map<String, Object>> banners(String position, String device, String country, Long article) {
        List<Map<String, Object>> matched = jdbc.queryForList("""
            SELECT 
                cr.creative_id AS id,
                cr.title,
                cr.media_url AS mediaUrl,
                cr.target_url AS targetUrl,
                s.position_code AS position,
                c.campaign_name AS campaignName,
                cr.creative_type AS creativeType,
                cr.mime_type AS mimeType
            FROM ad_creatives cr 
            JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id
            JOIN contracts ct ON ct.contract_id = c.contract_id 
            JOIN ad_slots s ON s.slot_id = ct.slot_id
            JOIN companies cp ON cp.company_id = ct.company_id
            LEFT JOIN ad_targeting t ON t.campaign_id = c.campaign_id
            WHERE s.position_code = ? 
              AND s.status = 'ACTIVE' 
              AND cr.status = 'APPROVED'
              AND cp.application_status = 'APPROVED'
              AND c.status = 'ACTIVE' 
              AND ct.status = 'ACTIVE' 
              AND ct.payment_status = 'PAID'
              AND c.scheduled_start_time <= CURRENT_TIMESTAMP 
              AND c.scheduled_end_time > CURRENT_TIMESTAMP
              AND ct.start_at <= CURRENT_TIMESTAMP 
              AND ct.end_at > CURRENT_TIMESTAMP
              AND cr.version_no = (
                  SELECT MAX(v.version_no) 
                  FROM ad_creatives v
                  WHERE v.campaign_id = c.campaign_id AND v.status = 'APPROVED'
              )
              AND (t.device_type IS NULL OR t.device_type = 'ALL' OR t.device_type = ?)
              AND (t.geo_scope IS NULL OR t.geo_scope = '' OR t.geo_scope = 'ALL' OR FIND_IN_SET(?, t.geo_scope) > 0)
              AND (NOT EXISTS (SELECT 1 FROM ad_targeting_categories x WHERE x.target_id = t.target_id)
                  OR EXISTS (SELECT 1 FROM ad_targeting_categories x 
                             JOIN article_categories a ON a.category_id = x.category_id 
                             WHERE x.target_id = t.target_id AND a.article_id = ?))
              AND (NOT EXISTS (SELECT 1 FROM ad_targeting_tags x WHERE x.target_id = t.target_id)
                  OR EXISTS (SELECT 1 FROM ad_targeting_tags x 
                             JOIN article_tags atg ON atg.tag_id = x.tag_id 
                             WHERE x.target_id = t.target_id AND atg.article_id = ?))
              AND (c.impression_limit IS NULL 
                  OR (SELECT COUNT(*) FROM ad_events e 
                      WHERE e.campaign_id = c.campaign_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) < c.impression_limit)
              AND (SELECT COUNT(*) FROM ad_events e 
                   JOIN ad_campaigns ec ON ec.campaign_id = e.campaign_id 
                   WHERE ec.contract_id = ct.contract_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) < ct.impressions_quota_snapshot
            ORDER BY cr.creative_id 
            LIMIT 3
            """, position, device, country, article, article);

        if (!matched.isEmpty()) {
            return matched;
        }

        // Dự phòng phân phối: Nếu vị trí chưa có chiến dịch độc quyền, phân phối các chiến dịch thật đang ACTIVE của hệ thống
        return jdbc.queryForList("""
            SELECT 
                cr.creative_id AS id,
                cr.title,
                cr.media_url AS mediaUrl,
                cr.target_url AS targetUrl,
                ? AS position,
                c.campaign_name AS campaignName,
                cr.creative_type AS creativeType,
                cr.mime_type AS mimeType
            FROM ad_creatives cr 
            JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id
            JOIN contracts ct ON ct.contract_id = c.contract_id 
            JOIN companies cp ON cp.company_id = ct.company_id
            WHERE cr.status = 'APPROVED'
              AND cp.application_status = 'APPROVED'
              AND c.status = 'ACTIVE' 
              AND ct.status = 'ACTIVE' 
              AND ct.payment_status = 'PAID'
              AND c.scheduled_start_time <= CURRENT_TIMESTAMP 
              AND c.scheduled_end_time > CURRENT_TIMESTAMP
              AND ct.start_at <= CURRENT_TIMESTAMP 
              AND ct.end_at > CURRENT_TIMESTAMP
            ORDER BY cr.creative_id 
            LIMIT 3
            """, position);
    }

    /**
     * [BF-08][UC-31] Phiên bản overload hỗ trợ gọi chỉ bằng position (tương thích ngược).
     */
    public List<Map<String, Object>> banners(String position) {
        return banners(position, "DESKTOP", "VN", null);
    }

    /**
     * [BF-08][UC-31] Ghi nhận raw event (IMPRESSION hoặc CLICK) với cơ chế chống gian lận (Anti-fraud Debounce).
     * Băm session trong cửa sổ 2 giây để chống đếm lặp gian lận click tặc, đồng thời kiểm tra quota và cập nhật bảng ad_metrics.
     *
     * @param creativeId ID banner quảng cáo
     * @param type Loại sự kiện ("IMPRESSION" hoặc "CLICK")
     * @param session ID session của trình duyệt
     * @return Target URL của mẫu quảng cáo
     */
    @Transactional
    public String recordEvent(Long creativeId, String type, String session) {
        if (creativeId == null) return "/";

        var rows = jdbc.queryForList("""
            SELECT cr.target_url, c.campaign_id, ct.slot_id, ct.contract_id 
            FROM ad_creatives cr 
            JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id 
            JOIN contracts ct ON ct.contract_id = c.contract_id 
            JOIN companies cp ON cp.company_id = ct.company_id 
            JOIN ad_slots s ON s.slot_id = ct.slot_id 
            WHERE cr.creative_id = ? 
              AND cr.status = 'APPROVED' 
              AND c.status = 'ACTIVE' 
              AND cp.application_status = 'APPROVED' 
              AND ct.status = 'ACTIVE' 
              AND ct.payment_status = 'PAID' 
              AND s.status = 'ACTIVE' 
              AND c.scheduled_start_time <= CURRENT_TIMESTAMP(6) 
              AND c.scheduled_end_time > CURRENT_TIMESTAMP(6) 
              AND ct.start_at <= CURRENT_TIMESTAMP(6) 
              AND ct.end_at > CURRENT_TIMESTAMP(6) 
            FOR UPDATE
            """, creativeId);

        if (rows.isEmpty()) return "/";
        var row = rows.get(0);

        String url = (String) row.get("target_url");
        CampaignWorkflowService.validateUrl(url);

        // Anti-fraud: Băm session trong cửa sổ 2 giây để chống đếm lặp gian lận hoặc double click vô tình
        String fingerprint = hash(session + ":" + creativeId + ":" + (System.currentTimeMillis() / 2000));
        Long existingCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM ad_events WHERE request_fingerprint = ? AND event_type = ?",
            Long.class, fingerprint, type
        );
        if (existingCount != null && existingCount > 0) {
            if ("CLICK".equals(type)) {
                // Ghi nhận click trùng lặp liên tục là KHÔNG HỢP LỆ (Anti-fraud click protection)
                String dupFingerprint = hash(session + ":" + creativeId + ":" + System.currentTimeMillis());
                jdbc.update("""
                    INSERT INTO ad_events (event_type, campaign_id, creative_id, slot_id, request_fingerprint, is_valid, invalid_reason) 
                    VALUES ('CLICK', ?, ?, ?, ?, FALSE, 'RAPID_CLICK_DUPLICATE')
                    """, row.get("campaign_id"), creativeId, row.get("slot_id"), dupFingerprint);

                jdbc.update("""
                    INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count) 
                    VALUES (?, CURRENT_DATE, 0, 0, 1, 0) 
                    ON DUPLICATE KEY UPDATE 
                        invalid_clicks_count = invalid_clicks_count + 1
                    """, creativeId);
            }
            return url;
        }

        // Kiểm tra hạn mức phân phối (Impression Quota) nếu là sự kiện IMPRESSION
        if ("IMPRESSION".equals(type)) {
            var quota = jdbc.queryForMap("""
                SELECT 
                    c.impression_limit,
                    ct.impressions_quota_snapshot,
                    (SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id = c.campaign_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) AS campaign_count,
                    (SELECT COUNT(*) FROM ad_events e JOIN ad_campaigns x ON x.campaign_id = e.campaign_id WHERE x.contract_id = ct.contract_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) AS contract_count 
                FROM ad_campaigns c 
                JOIN contracts ct ON ct.contract_id = c.contract_id 
                WHERE c.campaign_id = ?
                """, row.get("campaign_id"));

            long contractCount = ((Number) quota.get("contract_count")).longValue();
            long quotaSnapshot = ((Number) quota.get("impressions_quota_snapshot")).longValue();
            Long limit = quota.get("impression_limit") == null ? null : ((Number) quota.get("impression_limit")).longValue();
            long campaignCount = ((Number) quota.get("campaign_count")).longValue();

            if (contractCount >= quotaSnapshot || (limit != null && campaignCount >= limit)) {
                return url;
            }
        }

        // Lưu raw event vào ad_events
        jdbc.update("""
            INSERT INTO ad_events (event_type, campaign_id, creative_id, slot_id, request_fingerprint) 
            VALUES (?, ?, ?, ?, ?)
            """, type, row.get("campaign_id"), creativeId, row.get("slot_id"), fingerprint);

        // Cập nhật bảng aggregate ad_metrics tương thích ngược với các báo cáo hiện có
        jdbc.update("""
            INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count) 
            VALUES (?, CURRENT_DATE, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                impressions_count = impressions_count + VALUES(impressions_count),
                clicks_count = clicks_count + VALUES(clicks_count)
            """, creativeId, "IMPRESSION".equals(type) ? 1 : 0, "CLICK".equals(type) ? 1 : 0);

        return url;
    }

    /**
     * [BF-08][UC-31] Tương thích ngược: ghi nhận impression khi không có session.
     */
    public void recordImpression(Long creativeId) {
        if (creativeId == null) return;
        jdbc.update("""
            INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
            VALUES (?, CURRENT_DATE, 1, 0, 0, 0)
            ON DUPLICATE KEY UPDATE impressions_count = impressions_count + 1
            """, creativeId);
    }

    /**
     * [BF-08][UC-31] Tương thích ngược: ghi nhận click khi không có session.
     */
    public String recordClickAndGetTargetUrl(Long creativeId) {
        if (creativeId == null) return "/";
        List<String> urls = jdbc.queryForList(
            "SELECT target_url FROM ad_creatives WHERE creative_id = ?",
            String.class, creativeId
        );
        if (urls.isEmpty() || urls.get(0) == null || urls.get(0).isBlank()) {
            return "/";
        }
        jdbc.update("""
            INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
            VALUES (?, CURRENT_DATE, 0, 1, 0, 0)
            ON DUPLICATE KEY UPDATE clicks_count = clicks_count + 1
            """, creativeId);
        return urls.get(0);
    }

    /**
     * Băm session bằng SHA-256 để chống đếm lặp trong cửa sổ 2 giây; không lưu session/IP thô vào DB.
     */
    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
