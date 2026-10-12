package com.group5.premiumnews.repository;

import java.math.BigDecimal;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PremiumRequestRepository {
    public record Subscription(long id, long packageId, String packageName, Instant startAt, Instant endAt, String status, boolean current) {}
    public record Plan(long id, String code, String name, BigDecimal amount, String currency, int days) {}
    public record Request(long id, long userId, Plan plan, String status) {}
    private final JdbcTemplate jdbc;

    public PremiumRequestRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Subscription> subscriptions(long userId) {
        return jdbc.query("""
                SELECT subscription_id,package_id,package_name_snapshot,start_at,end_at,status,
                    (status='ACTIVE' AND start_at<=CURRENT_TIMESTAMP(6) AND end_at>CURRENT_TIMESTAMP(6)) AS current_access
                FROM subscriptions WHERE user_id=? ORDER BY end_at DESC LIMIT 100
                """, (rs, n) -> new Subscription(rs.getLong("subscription_id"), rs.getLong("package_id"),
                rs.getString("package_name_snapshot"), rs.getTimestamp("start_at").toInstant(),
                rs.getTimestamp("end_at").toInstant(), rs.getString("status"), rs.getBoolean("current_access")), userId);
    }

    public boolean lockActiveUser(long id) {
        return !jdbc.queryForList("SELECT user_id FROM users WHERE user_id=? AND status='ACTIVE' FOR UPDATE", Long.class, id).isEmpty();
    }

    public Optional<Plan> activePlan(long id) {
        return jdbc.query("SELECT * FROM subscription_packages WHERE package_id=? AND status='ACTIVE'",
                (rs, n) -> new Plan(rs.getLong("package_id"), rs.getString("code"), rs.getString("name"),
                        rs.getBigDecimal("price"), rs.getString("currency"), rs.getInt("duration_days")), id).stream().findFirst();
    }

    public Optional<Request> pending(long userId) {
        return requests("SELECT * FROM premium_requests WHERE user_id=? AND status='PENDING'", userId).stream().findFirst();
    }

    public Optional<Request> lockRequest(long id) {
        return requests("SELECT * FROM premium_requests WHERE request_id=? FOR UPDATE", id).stream().findFirst();
    }

    private List<Request> requests(String sql, long id) {
        return jdbc.query(sql, (rs, n) -> new Request(rs.getLong("request_id"), rs.getLong("user_id"),
                new Plan(rs.getLong("package_id"), rs.getString("package_code"), rs.getString("package_name"),
                        rs.getBigDecimal("amount"), rs.getString("currency"), rs.getInt("duration_days")), rs.getString("status")), id);
    }

    public long create(long userId, Plan plan) {
        return insert("""
                INSERT INTO premium_requests(user_id,package_id,package_code,package_name,amount,currency,duration_days)
                VALUES (?,?,?,?,?,?,?)
                """, userId, plan.id(), plan.code(), plan.name(), plan.amount(), plan.currency(), plan.days());
    }

    public List<Map<String, Object>> list(Long userId) {
        String sql = """
                SELECT r.request_id AS id,r.user_id AS userId,u.username,u.email,
                       r.package_name AS packageName,r.amount,r.currency,r.duration_days AS durationDays,
                       r.status,r.submitted_at AS submittedAt,r.review_note AS reviewNote,
                       r.reviewed_at AS reviewedAt,r.reviewed_by AS reviewedBy,
                       s.start_at AS startAt,s.end_at AS endAt
                FROM premium_requests r JOIN users u ON u.user_id=r.user_id
                LEFT JOIN subscriptions s ON s.subscription_id=r.subscription_id
                """;
        return userId == null ? jdbc.queryForList(sql + " ORDER BY (r.status='PENDING') DESC,r.submitted_at DESC LIMIT 200")
                : jdbc.queryForList(sql + " WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 100", userId);
    }

    public Instant latestExpiry(long userId) {
        Timestamp end = jdbc.queryForObject("SELECT MAX(end_at) FROM subscriptions WHERE user_id=? AND status='ACTIVE'", Timestamp.class, userId);
        return end == null ? null : end.toInstant();
    }

    public long activate(Request request, Instant start, Instant end) {
        Plan p = request.plan();
        long subscription = insert("""
                INSERT INTO subscriptions(user_id,package_id,package_code_snapshot,package_name_snapshot,
                    price_snapshot,currency,duration_days_snapshot,start_at,end_at,status)
                VALUES (?,?,?,?,?,?,?,?,?,'ACTIVE')
                """, request.userId(), p.id(), p.code(), p.name(), p.amount(), p.currency(), p.days(), Timestamp.from(start), Timestamp.from(end));
        String transactionType = start.isAfter(Instant.now()) ? "PREMIUM_RENEWAL" : "PREMIUM_PURCHASE";
        jdbc.update("""
                INSERT INTO transactions(txn_ref,transaction_type,user_id,subscription_id,amount,currency,payment_gateway,status,paid_at)
                VALUES (?,?,?,?,?,?,'MANUAL','SUCCESS',CURRENT_TIMESTAMP(6))
                """, "MANUAL-PREMIUM-" + request.id(), transactionType, request.userId(), subscription, p.amount(), p.currency());
        jdbc.update("""
                INSERT IGNORE INTO user_roles(user_id,role_id)
                SELECT ?,role_id FROM roles WHERE role_name='SUBSCRIBER' AND status='ACTIVE'
                """, request.userId());
        return subscription;
    }

    public void review(long id, long adminId, String status, String note, Long subscription) {
        jdbc.update("""
                UPDATE premium_requests SET status=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(6),review_note=?,subscription_id=?
                WHERE request_id=? AND status='PENDING'
                """, status, adminId, note, subscription, id);
    }

    private long insert(String sql, Object... values) {
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.length; i++) statement.setObject(i + 1, values[i]);
            return statement;
        }, key);
        return java.util.Objects.requireNonNull(key.getKey()).longValue();
    }
}
