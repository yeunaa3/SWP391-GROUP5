package com.group5.premiumnews.service;

import com.group5.premiumnews.repository.PremiumRequestRepository;
import java.sql.Timestamp;
import java.time.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PremiumAdAllowanceService {
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final int DAILY_SECONDS = 300;
    static final int LEASE_SECONDS = 10;
    public record Allowance(int remainingSeconds, Instant leaseUntil, String resetDate) {}
    private record Usage(int used, Instant lease) {}
    private final JdbcTemplate jdbc;
    private final PremiumRequestRepository memberships;

    public PremiumAdAllowanceService(JdbcTemplate jdbc, PremiumRequestRepository memberships) {
        this.jdbc = jdbc;
        this.memberships = memberships;
    }

    // Reserve at most ten seconds per account, not per tab/device. A lost
    // connection cannot silently grant unlimited ad-free time.
    @Transactional
    public Allowance reserve(long userId) {
        Instant now = Instant.now();
        LocalDate date = now.atZone(ZONE).toLocalDate();
        var current = memberships.subscriptions(userId).stream().filter(s -> s.current()).findFirst();
        if (current.isEmpty()) return new Allowance(0, now, date.plusDays(1).toString());
        jdbc.update("INSERT IGNORE INTO premium_daily_ad_usage(user_id,usage_date) VALUES (?,?)", userId, date);
        Usage usage = jdbc.queryForObject("SELECT used_seconds,lease_until FROM premium_daily_ad_usage WHERE user_id=? AND usage_date=? FOR UPDATE",
                (rs, n) -> new Usage(rs.getInt(1), rs.getTimestamp(2) == null ? null : rs.getTimestamp(2).toInstant()), userId, date);
        if (usage.lease() != null && usage.lease().isAfter(now)) {
            return new Allowance(Math.max(0, DAILY_SECONDS - usage.used()) + secondsLeft(now, usage.lease()), usage.lease(), date.plusDays(1).toString());
        }
        int grant = Math.min(LEASE_SECONDS, Math.max(0, DAILY_SECONDS - usage.used()));
        Instant until = now.plusSeconds(grant);
        Instant midnight = date.plusDays(1).atStartOfDay(ZONE).toInstant();
        if (until.isAfter(midnight)) until = midnight;
        Instant membershipEnd = current.get().endAt();
        if (until.isAfter(membershipEnd)) until = membershipEnd;
        jdbc.update("UPDATE premium_daily_ad_usage SET used_seconds=?,lease_until=? WHERE user_id=? AND usage_date=?",
                usage.used() + grant, Timestamp.from(until), userId, date);
        return new Allowance(Math.max(0, DAILY_SECONDS - usage.used()), until, date.plusDays(1).toString());
    }

    static int secondsLeft(Instant now, Instant until) {
        return (int) Math.max(0, (Duration.between(now, until).toMillis() + 999) / 1000);
    }
}
