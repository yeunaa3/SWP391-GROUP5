package com.group5.premiumnews.service;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * ============================================================================
 * [BF-08][JOB-04 & JOB-06] ADVERTISING TELEMETRY RECONCILIATION & REPORT FINALIZER
 * Phụ trách: Cường (Ad Metrics Aggregator, Anti-fraud Reconciler & Campaign Finalizer)
 *
 * Nhiệm vụ chính:
 * 1. [JOB-04] Định kỳ đối soát số liệu lượt xem, click hợp lệ và click không hợp lệ từ
 *    bảng nhật ký thô ad_events sang bảng tổng hợp ad_metrics.
 * 2. [JOB-06] Tự động chốt chiến dịch sang COMPLETED khi đạt hạn mức quota hiển thị
 *    hoặc quá ngày kết thúc, lập báo cáo bất biến và gửi thông báo cho đối tác.
 * ============================================================================
 */
@Component
public class AdvertisingMetricsScheduler {

    private static final Logger log = LoggerFactory.getLogger(AdvertisingMetricsScheduler.class);

    private final JdbcTemplate jdbc;

    public AdvertisingMetricsScheduler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Quét định kỳ mỗi 60 giây (hoặc cấu hình app.ad-metrics.interval-ms).
     * Bắt đầu chạy sau khi server bật 30 giây.
     */
    @Scheduled(
            fixedDelayString = "${app.ad-metrics.interval-ms:60000}",
            initialDelay = 30000
    )
    public void runMetricsCycle() {
        try {
            reconcileMetrics();
            finalizeCompletedCampaigns();
        } catch (Exception ex) {
            log.error("[JOB-04/06 AdMetricsScheduler] Lỗi trong chu kỳ tổng hợp số liệu quảng cáo: {}", ex.getMessage(), ex);
        }
    }

    /**
     * [BF-08][JOB-04] Đối soát và tổng hợp số liệu từ ad_events vào ad_metrics
     * Đảm bảo tính nhất quán dữ liệu giữa bảng telemetry thời gian thực và bảng báo cáo.
     */
    @Transactional
    public void reconcileMetrics() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT 
                creative_id,
                DATE(occurred_at) AS m_date,
                SUM(event_type = 'IMPRESSION' AND is_valid = TRUE) AS imps,
                SUM(event_type = 'CLICK' AND is_valid = TRUE) AS clks,
                SUM(event_type = 'CLICK' AND is_valid = FALSE) AS inv_clks
            FROM ad_events
            WHERE occurred_at >= CURRENT_DATE - INTERVAL 7 DAY
            GROUP BY creative_id, DATE(occurred_at)
            """);

        for (Map<String, Object> r : rows) {
            long creativeId = ((Number) r.get("creative_id")).longValue();
            Object mDate = r.get("m_date");
            long imps = r.get("imps") == null ? 0 : ((Number) r.get("imps")).longValue();
            long clks = r.get("clks") == null ? 0 : ((Number) r.get("clks")).longValue();
            long invClks = r.get("inv_clks") == null ? 0 : ((Number) r.get("inv_clks")).longValue();

            jdbc.update("""
                INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
                VALUES (?, ?, ?, ?, ?, 0)
                ON DUPLICATE KEY UPDATE
                    impressions_count = VALUES(impressions_count),
                    clicks_count = VALUES(clicks_count),
                    invalid_clicks_count = VALUES(invalid_clicks_count)
                """, creativeId, mDate, imps, clks, invClks);
        }
    }

    /**
     * [BF-08][JOB-06] Tự động chốt các chiến dịch đã đạt quota hoặc hết hạn phân phối
     * Chuyển trạng thái sang COMPLETED và ghi nhật ký kiểm toán báo cáo cuối cùng.
     */
    @Transactional
    public void finalizeCompletedCampaigns() {
        List<Map<String, Object>> candidates = jdbc.queryForList("""
            SELECT 
                c.campaign_id,
                c.campaign_name,
                c.impression_limit,
                ct.contract_code,
                ct.impressions_quota_snapshot,
                cp.company_name,
                u.user_id,
                (SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id = c.campaign_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE) AS total_impressions,
                (SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id = c.campaign_id AND e.event_type = 'CLICK' AND e.is_valid = TRUE) AS total_clicks,
                (SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id = c.campaign_id AND e.event_type = 'CLICK' AND e.is_valid = FALSE) AS total_invalid_clicks
            FROM ad_campaigns c
            JOIN contracts ct ON ct.contract_id = c.contract_id
            JOIN companies cp ON cp.company_id = ct.company_id
            LEFT JOIN users u ON u.company_id = cp.company_id
            WHERE c.status IN ('ACTIVE', 'PAUSED')
              AND (
                  c.scheduled_end_time <= CURRENT_TIMESTAMP(6)
                  OR (c.impression_limit IS NOT NULL AND (
                      SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id = c.campaign_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE
                  ) >= c.impression_limit)
                  OR ((
                      SELECT COUNT(*) FROM ad_events e JOIN ad_campaigns x ON x.campaign_id = e.campaign_id 
                      WHERE x.contract_id = ct.contract_id AND e.event_type = 'IMPRESSION' AND e.is_valid = TRUE
                  ) >= ct.impressions_quota_snapshot)
              )
            FOR UPDATE
            """);

        for (Map<String, Object> row : candidates) {
            long campId = ((Number) row.get("campaign_id")).longValue();
            String name = (String) row.get("campaign_name");
            Long userId = row.get("user_id") == null ? null : ((Number) row.get("user_id")).longValue();
            long imps = ((Number) row.get("total_impressions")).longValue();
            long clks = ((Number) row.get("total_clicks")).longValue();
            long invClks = ((Number) row.get("total_invalid_clicks")).longValue();
            double ctr = imps > 0 ? ((double) clks / imps * 100.0) : 0.0;

            // 1. Chuyển trạng thái sang COMPLETED
            jdbc.update("""
                UPDATE ad_campaigns 
                SET status = 'COMPLETED', ended_at = CURRENT_TIMESTAMP(6), edit_version = edit_version + 1 
                WHERE campaign_id = ?
                """, campId);

            // 2. Ghi nhật ký kiểm toán bất biến vào campaign_activity
            String summaryNote = String.format("Chiến dịch đã hoàn tất phân phối. Báo cáo cuối cùng: %,d Lượt hiển thị, %,d Lượt Click (CTR: %.2f%%), %,d Click không hợp lệ.",
                    imps, clks, ctr, invClks);
            jdbc.update("""
                INSERT INTO campaign_activity (campaign_id, action, note) 
                VALUES (?, 'FINAL_REPORT', ?)
                """, campId, summaryNote);

            // 3. Gửi thông báo đến tài khoản doanh nghiệp
            if (userId != null) {
                jdbc.update("""
                    INSERT INTO notifications (user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
                    VALUES (?, 'Chiến dịch quảng cáo đã hoàn thành', ?, 'CAMPAIGN', 'CAMPAIGN', ?, 'SENT', CURRENT_TIMESTAMP(6))
                    """, userId, "Chiến dịch '" + name + "' đã hoàn tất phân phối. Hãy mở trang Báo cáo để xem và tải kết quả.", String.valueOf(campId));
            }

            log.info("[JOB-06] Hoàn tất và chốt báo cáo cho campaign_id={}: {}", campId, summaryNote);
        }
    }
}
