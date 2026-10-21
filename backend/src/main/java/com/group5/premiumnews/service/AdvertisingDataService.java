package com.group5.premiumnews.service;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
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
 * [BF-08] AD CAMPAIGN DELIVERY & ANALYTICS SERVICE
 * Phụ trách: Cường (Ad Manager & Real-Time Ad Serving Engine)
 * 
 * Các Use Case liên quan:
 * - [UC-31] Hiển thị banner quảng cáo, ghi nhận lượt xem (Impression) và lượt bấm (Click)
 * - [UC-32] Báo cáo hiệu suất chiến dịch cho Doanh nghiệp (BUS-18) và Quản trị viên (ADM-09)
 * - [UC-39] Tạm dừng (PAUSE) hoặc Tiếp tục (RESUME) phân phối chiến dịch quảng cáo
 * ============================================================================
 */
@Service
public class AdvertisingDataService {

    private final JdbcTemplate jdbc;

    public AdvertisingDataService(JdbcTemplate jdbc) {
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

    /**
     * [BF-08][UC-32][BUS-18][ADM-09] Lấy chuỗi dữ liệu hiệu suất theo ngày (Impressions, Clicks, Invalid Clicks).
     * Phục vụ vẽ biểu đồ xu hướng (Trend Chart) trên dashboard doanh nghiệp và quản lý quảng cáo.
     *
     * @param principal Người dùng đang đăng nhập (Doanh nghiệp chỉ xem được của mình, Ad Manager xem tất cả)
     * @return Danh sách số liệu thống kê theo ngày và chiến dịch
     */
    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> performance(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));

        return jdbc.queryForList("""
            SELECT 
                c.campaign_id AS campaignId,
                c.campaign_name AS campaignName,
                DATE(e.occurred_at) AS metricDate,
                SUM(e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) AS impressions,
                SUM(e.event_type = 'CLICK' AND e.is_valid = TRUE) AS clicks,
                SUM(e.event_type = 'CLICK' AND e.is_valid = FALSE) AS invalidClicks
            FROM ad_events e 
            JOIN ad_campaigns c ON c.campaign_id = e.campaign_id 
            JOIN contracts ct ON ct.contract_id = c.contract_id
            WHERE (? OR ct.company_id = (SELECT company_id FROM users WHERE user_id = ?))
            GROUP BY c.campaign_id, c.campaign_name, DATE(e.occurred_at)
            ORDER BY metricDate, c.campaign_id
            """, staff, principal.id());
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
        return jdbc.queryForList("""
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
    }

    /**
     * [BF-08][UC-31] Phiên bản overload hỗ trợ gọi chỉ bằng position (tương thích ngược).
     */
    public List<Map<String, Object>> banners(String position) {
        return banners(position, "DESKTOP", "VN", null);
    }

    /**
     * [BF-08][ADM-09] Lấy danh sách toàn bộ chiến dịch quảng cáo kèm số liệu tổng hợp (Impressions, Clicks, CTR).
     * Phục vụ màn hình giám sát thời gian thực của Ad Manager (Active Campaign Monitor).
     *
     * @param principal Người dùng đang thao tác
     * @return Danh sách chi tiết các chiến dịch, kích thước slot, thời gian chạy, tổng lượt xem và click
     */
    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> campaigns(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));

        return jdbc.queryForList("""
            SELECT 
                c.campaign_id AS id,
                c.campaign_name AS name,
                c.status,
                c.description,
                ct.contract_code AS contractCode,
                cp.company_name AS companyName,
                s.slot_name AS slotName,
                s.position_code AS positionCode,
                s.width_px AS widthPx,
                s.height_px AS heightPx,
                c.scheduled_start_time AS startTime,
                c.scheduled_end_time AS endTime,
                (SELECT v.media_url FROM ad_creatives v WHERE v.campaign_id = c.campaign_id ORDER BY v.version_no DESC LIMIT 1) AS mediaUrl,
                (SELECT v.target_url FROM ad_creatives v WHERE v.campaign_id = c.campaign_id ORDER BY v.version_no DESC LIMIT 1) AS targetUrl,
                ct.total_value AS amount,
                COALESCE(SUM(m.impressions_count), 0) AS impressions,
                COALESCE(SUM(m.clicks_count), 0) AS clicks,
                COALESCE(SUM(m.invalid_clicks_count), 0) AS invalidClicks
            FROM ad_campaigns c
            JOIN contracts ct ON ct.contract_id = c.contract_id
            JOIN companies cp ON cp.company_id = ct.company_id
            JOIN ad_slots s ON s.slot_id = ct.slot_id
            LEFT JOIN ad_creatives cr ON cr.campaign_id = c.campaign_id
            LEFT JOIN ad_metrics m ON m.creative_id = cr.creative_id
            WHERE (? OR ct.company_id = (SELECT company_id FROM users WHERE user_id = ?))
            GROUP BY 
                c.campaign_id, c.campaign_name, c.status, c.description, ct.contract_code, cp.company_name,
                s.slot_name, s.position_code, s.width_px, s.height_px, c.scheduled_start_time, c.scheduled_end_time, ct.total_value
            ORDER BY c.campaign_id
            """, staff, principal.id());
    }

    /**
     * [BF-08][UC-31] Ghi nhận raw event (IMPRESSION hoặc CLICK) với cơ chế chống gian lận (Anti-fraud Debounce).
     * Băm session trong cửa sổ 30 giây để chống đếm lặp, đồng thời kiểm tra quota và cập nhật bảng ad_metrics.
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
        var row = rows.getFirst();

        String url = (String) row.get("target_url");
        CampaignWorkflowService.validateUrl(url);

        // Anti-fraud: Băm session trong cửa sổ 30 giây để chống đếm lặp gian lận
        String fingerprint = hash(session + ":" + creativeId + ":" + (System.currentTimeMillis() / 30000));
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
     * Băm session bằng SHA-256 để chống đếm lặp trong cửa sổ 30 giây; không lưu session/IP thô vào DB.
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

    /**
     * ========================================================================
     * [BF-08][UC-39] TÍNH NĂNG TRỌNG TÂM: TẠM DỪNG / TIẾP TỤC CHIẾN DỊCH QUẢNG CÁO
     * Phục vụ: Ad Manager thao tác trên màn hình ADM-09 Active Campaign Monitor
     * 
     * Quy tắc chuyển đổi trạng thái (Workflow Transition Policy):
     * - ACTIVE -> PAUSED: Tạm dừng hiển thị banner (đáp ứng yêu cầu pháp lý, kỹ thuật hoặc theo yêu cầu đối tác)
     * - PAUSED -> ACTIVE: Khôi phục phân phối banner bình thường vào ad server rotation
     * ========================================================================
     *
     * @param campaignId ID chiến dịch cần chuyển đổi trạng thái
     * @return Map chứa campaignId và trạng thái mới (status: "ACTIVE" hoặc "PAUSED")
     */
    @PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")
    public Map<String, Object> toggleCampaignStatus(Long campaignId) {
        List<String> statuses = jdbc.queryForList(
            "SELECT status FROM ad_campaigns WHERE campaign_id = ?",
            String.class,
            campaignId
        );
        if (statuses.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy chiến dịch có mã: " + campaignId);
        }

        String currentStatus = statuses.get(0);
        String nextStatus;

        if ("ACTIVE".equalsIgnoreCase(currentStatus)) {
            nextStatus = "PAUSED";
        } else if ("PAUSED".equalsIgnoreCase(currentStatus)) {
            nextStatus = "ACTIVE";
        } else {
            throw new IllegalStateException("Không thể đảo trạng thái chiến dịch đang ở trạng thái: " + currentStatus);
        }

        jdbc.update("UPDATE ad_campaigns SET status = ? WHERE campaign_id = ?", nextStatus, campaignId);
        return Map.of("campaignId", campaignId, "status", nextStatus);
    }
}
