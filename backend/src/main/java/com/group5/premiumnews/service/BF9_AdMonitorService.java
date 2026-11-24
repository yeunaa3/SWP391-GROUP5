package com.group5.premiumnews.service;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * ============================================================================
 * [BF-09] LUỒNG 9: GIÁM SÁT HIỆU SUẤT & ĐIỀU HÀNH CHIẾN DỊCH (SERVICE XỬ LÝ)
 * Phụ trách: Cường (Ad Performance Analytics & Emergency Operations)
 * 
 * Các Use Case liên quan:
 * - [ADM-09] Màn hình giám sát chiến dịch đang chạy (Active Campaign Monitor)
 * - [BUS-18] Báo cáo hiệu suất theo ngày cho doanh nghiệp (Trend Chart data)
 * - [UC-39] Nút khẩn cấp: Tạm dừng (PAUSE) hoặc Tiếp tục (RESUME) chiến dịch quảng cáo
 * ============================================================================
 */
@Service
public class BF9_AdMonitorService {

    private final JdbcTemplate jdbc;

    public BF9_AdMonitorService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * [BF-09][ADM-09] Lấy danh sách toàn bộ chiến dịch quảng cáo kèm số liệu tổng hợp (Impressions, Clicks, CTR).
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
     * [BF-09][UC-32][BUS-18][ADM-09] Lấy chuỗi dữ liệu hiệu suất theo ngày (Impressions, Clicks, Invalid Clicks).
     * Phục vụ vẽ biểu đồ xu hướng (Trend Chart) trên dashboard doanh nghiệp và quản lý quảng cáo.
     *
     * @param principal Người dùng đang đăng nhập (Doanh nghiệp chỉ xem được của mình, Ad Manager xem tất cả)
     * @return Danh sách số liệu thống kê theo ngày và chiến dịch
     */
    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> performance(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));

        // 1. Ưu tiên đọc dữ liệu chuỗi thời gian đã tổng hợp từ ad_metrics
        List<Map<String, Object>> fromMetrics = jdbc.queryForList("""
            SELECT 
                c.campaign_id AS campaignId,
                c.campaign_name AS campaignName,
                m.metric_date AS metricDate,
                m.impressions_count AS impressions,
                m.clicks_count AS clicks,
                m.invalid_clicks_count AS invalidClicks
            FROM ad_metrics m
            JOIN ad_creatives cr ON cr.creative_id = m.creative_id
            JOIN ad_campaigns c ON c.campaign_id = cr.campaign_id
            JOIN contracts ct ON ct.contract_id = c.contract_id
            WHERE (? OR ct.company_id = (SELECT company_id FROM users WHERE user_id = ?))
            ORDER BY m.metric_date, c.campaign_id
            """, staff, principal.id());

        if (!fromMetrics.isEmpty()) {
            return fromMetrics;
        }

        // 2. Dự phòng: Tổng hợp trực tiếp từ raw events trong ad_events nếu chưa kết chuyển sang ad_metrics
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
     * ========================================================================
     * [BF-09][UC-39] NÚT KHẨN CẤP: TẠM DỪNG / TIẾP TỤC CHIẾN DỊCH QUẢNG CÁO
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
