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
 * [BF-01][JOB-01] PREVENT SUBSCRIPTION OVERSTAY & AUTO EXPIRE STALE REQUESTS
 * Phụ trách: Cường (Quản trị vòng đời thuê bao Premium & Dọn dẹp đơn quá hạn)
 *
 * Nhiệm vụ chính:
 * 1. Định kỳ quét các gói thuê bao đã hết hạn (end_at <= NOW()).
 *    - Chuyển trạng thái sang EXPIRED.
 *    - Tự động thu hồi quyền SUBSCRIBER nếu người dùng không còn gói nào còn hạn.
 *    - Gửi thông báo hết hạn vào hòm thư hệ thống.
 * 2. Tự động hủy các yêu cầu thanh toán PENDING bị bỏ dở quá 24 giờ.
 * ============================================================================
 */
@Component
public class PremiumSubscriptionScheduler {

    private static final Logger log = LoggerFactory.getLogger(PremiumSubscriptionScheduler.class);

    private final JdbcTemplate jdbc;

    public PremiumSubscriptionScheduler(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Quét định kỳ mỗi 60 giây (hoặc cấu hình app.premium.expire-check-interval-ms).
     * Chạy ngay sau khi server khởi động 15 giây.
     */
    @Scheduled(
            fixedDelayString = "${app.premium.expire-check-interval-ms:60000}",
            initialDelay = 15000
    )
    public void runExpirationCycle() {
        try {
            int expiredSubs = expireOverdueSubscriptions();
            int expiredRequests = expireStalePendingRequests();
            if (expiredSubs > 0 || expiredRequests > 0) {
                log.info("[JOB-01 PremiumScheduler] Đã quét: {} gói hết hạn, {} đơn quá hạn tự động đóng.",
                        expiredSubs, expiredRequests);
            }
        } catch (Exception ex) {
            log.error("[JOB-01 PremiumScheduler] Lỗi trong chu kỳ quét hết hạn gói Premium: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Quét và hết hạn các subscription có end_at <= NOW()
     */
    @Transactional
    public int expireOverdueSubscriptions() {
        String findExpiredSql = """
                SELECT subscription_id, user_id, package_name_snapshot, end_at
                FROM subscriptions
                WHERE status = 'ACTIVE' AND end_at <= CURRENT_TIMESTAMP(6)
                FOR UPDATE
                """;

        List<Map<String, Object>> overdue = jdbc.queryForList(findExpiredSql);
        if (overdue.isEmpty()) {
            return 0;
        }

        for (Map<String, Object> row : overdue) {
            long subId = ((Number) row.get("subscription_id")).longValue();
            long userId = ((Number) row.get("user_id")).longValue();
            String pkgName = String.valueOf(row.getOrDefault("package_name_snapshot", "Premium"));

            // 1. Chuyển subscription sang EXPIRED
            jdbc.update("UPDATE subscriptions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP(6) WHERE subscription_id = ?", subId);

            // 2. Kiểm tra xem user này còn gói nào ACTIVE và end_at > NOW() hay không
            Integer activeCount = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' AND end_at > CURRENT_TIMESTAMP(6)",
                    Integer.class,
                    userId
            );

            // 3. Nếu không còn gói nào còn hạn -> Thu hồi quyền SUBSCRIBER
            if (activeCount == null || activeCount == 0) {
                jdbc.update("""
                        DELETE ur FROM user_roles ur
                        JOIN roles r ON r.role_id = ur.role_id
                        WHERE ur.user_id = ? AND r.role_name = 'SUBSCRIBER'
                        """, userId);
                log.info("[JOB-01] Thu hồi role SUBSCRIBER của user_id={} do hết hạn gói (sub_id={})", userId, subId);
            }

            // 4. Bắn thông báo vào app
            jdbc.update("""
                    INSERT INTO notifications(user_id, title, content, notification_type, related_entity_type, related_entity_id, delivery_status, sent_at)
                    VALUES (?, 'Gói Premium đã hết hạn', ?, 'PREMIUM', 'SUBSCRIPTION', ?, 'SENT', CURRENT_TIMESTAMP(6))
                    """, userId, "Gói thuê bao '" + pkgName + "' của bạn đã hết hạn sử dụng. Hãy gia hạn để tiếp tục đọc báo không giới hạn và không quảng cáo.", String.valueOf(subId));
        }

        return overdue.size();
    }

    /**
     * Tự động hủy các đơn PENDING quá 24 giờ để người dùng không bị kẹt
     */
    @Transactional
    public int expireStalePendingRequests() {
        return jdbc.update("""
                UPDATE premium_requests
                SET status = 'REJECTED',
                    review_note = 'Hệ thống tự động đóng yêu cầu do quá hạn thanh toán (24 giờ)',
                    reviewed_at = CURRENT_TIMESTAMP(6)
                WHERE status = 'PENDING'
                  AND submitted_at < DATE_SUB(CURRENT_TIMESTAMP(6), INTERVAL 24 HOUR)
                """);
    }
}
