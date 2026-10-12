package com.group5.premiumnews.repository;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminOverviewRepository {
    private final JdbcTemplate jdbc;
    public AdminOverviewRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<String, Object> snapshot(int days) {
        // Use the database date for every bucket to avoid JVM/DB timezone drift.
        LocalDate today = jdbc.queryForObject("SELECT CURRENT_DATE", java.sql.Date.class).toLocalDate();
        LocalDate first = today.minusDays(days - 1);
        var totals = jdbc.queryForMap("""
                SELECT (SELECT COUNT(*) FROM users) AS users,
                  (SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status='ACTIVE'
                    AND start_at<=CURRENT_TIMESTAMP AND end_at>CURRENT_TIMESTAMP) AS subscribers,
                  (SELECT COUNT(*) FROM companies) AS companies,
                  (SELECT COUNT(*) FROM ad_campaigns WHERE status='ACTIVE') AS activeCampaigns,
                  (SELECT COUNT(*) FROM articles WHERE status='PUBLISHED') AS articles,
                  (SELECT COUNT(*) FROM premium_requests WHERE status='PENDING') AS pendingRequests
                """);
        Map<LocalDate, Map<String, Object>> daily = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            LocalDate date = first.plusDays(i);
            var bucket = new LinkedHashMap<String, Object>();
            bucket.put("date", date.toString()); bucket.put("revenue", 0); bucket.put("users", 0); bucket.put("requests", 0);
            daily.put(date, bucket);
        }
        fill(daily, "revenue", """
                SELECT DATE(paid_at) AS day, SUM(amount) AS value FROM transactions
                WHERE status='SUCCESS' AND transaction_type<>'REFUND' AND currency='VND'
                  AND paid_at>=? AND paid_at<DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
                GROUP BY DATE(paid_at)
                """, first);
        fill(daily, "users", "SELECT DATE(created_at) AS day,COUNT(*) AS value FROM users WHERE created_at>=? AND created_at<DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) GROUP BY DATE(created_at)", first);
        fill(daily, "requests", "SELECT DATE(submitted_at) AS day,COUNT(*) AS value FROM premium_requests WHERE submitted_at>=? AND submitted_at<DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) GROUP BY DATE(submitted_at)", first);
        var status = jdbc.queryForList("SELECT status,COUNT(*) AS count FROM premium_requests GROUP BY status");
        var recent = jdbc.queryForList("""
                SELECT r.request_id AS id,u.username,r.package_name AS packageName,r.amount,r.currency,
                       r.status,r.submitted_at AS submittedAt
                FROM premium_requests r JOIN users u ON u.user_id=r.user_id
                ORDER BY (r.status='PENDING') DESC,r.submitted_at DESC LIMIT 6
                """);
        return Map.of("totals", totals, "daily", List.copyOf(daily.values()), "requestStatus", status,
                "recentRequests", recent, "days", days, "asOf", java.time.Instant.now().toString());
    }

    private void fill(Map<LocalDate, Map<String, Object>> daily, String field, String sql, LocalDate first) {
        jdbc.query(sql, (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
            var bucket = daily.get(rs.getDate("day").toLocalDate());
            if (bucket != null) bucket.put(field, rs.getBigDecimal("value"));
        }, java.sql.Date.valueOf(first));
    }
}
