package com.group5.premiumnews.service;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class AdvertisingDataService {
    private final JdbcTemplate jdbc;
    public AdvertisingDataService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> availability() {
        // Only expose occupied slot/time windows, not another company's contract data.
        return jdbc.queryForList("""
            SELECT slot_id AS slotId,start_at AS startAt,end_at AS endAt
            FROM contracts WHERE status='ACTIVE' AND payment_status='PAID' AND end_at>CURRENT_TIMESTAMP
            ORDER BY start_at
            """);
    }

    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> performance(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));
        return jdbc.queryForList("""
            SELECT c.campaign_id AS campaignId,c.campaign_name AS campaignName,m.metric_date AS metricDate,
                SUM(m.impressions_count) AS impressions,SUM(m.clicks_count) AS clicks,
                SUM(m.invalid_clicks_count) AS invalidClicks
            FROM ad_metrics m JOIN ad_creatives cr ON cr.creative_id=m.creative_id
            JOIN ad_campaigns c ON c.campaign_id=cr.campaign_id JOIN contracts ct ON ct.contract_id=c.contract_id
            WHERE (? OR ct.company_id=(SELECT company_id FROM users WHERE user_id=?))
            GROUP BY c.campaign_id,c.campaign_name,m.metric_date
            ORDER BY m.metric_date,c.campaign_id
            """, staff, principal.id());
    }

    public List<Map<String, Object>> banners(String position) {
        return jdbc.queryForList("""
            SELECT cr.creative_id AS id,cr.title,cr.media_url AS mediaUrl,cr.target_url AS targetUrl,
                s.position_code AS position,c.campaign_name AS campaignName
            FROM ad_creatives cr JOIN ad_campaigns c ON c.campaign_id=cr.campaign_id
            JOIN contracts ct ON ct.contract_id=c.contract_id JOIN ad_slots s ON s.slot_id=ct.slot_id
            WHERE s.position_code=? AND s.status='ACTIVE' AND cr.status='APPROVED'
                AND c.status='ACTIVE' AND ct.status='ACTIVE' AND ct.payment_status='PAID'
                AND c.scheduled_start_time<=CURRENT_TIMESTAMP AND c.scheduled_end_time>CURRENT_TIMESTAMP
                AND ct.start_at<=CURRENT_TIMESTAMP AND ct.end_at>CURRENT_TIMESTAMP
                AND cr.version_no=(SELECT MAX(v.version_no) FROM ad_creatives v
                    WHERE v.campaign_id=c.campaign_id AND v.status='APPROVED')
            ORDER BY cr.creative_id LIMIT 3
            """, position);
    }

    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> campaigns(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));
        return jdbc.queryForList("""
            SELECT c.campaign_id AS id,c.campaign_name AS name,c.status,c.description,ct.contract_code AS contractCode,
                cp.company_name AS companyName,s.slot_name AS slotName,s.position_code AS positionCode,
                s.width_px AS widthPx,s.height_px AS heightPx,
                c.scheduled_start_time AS startTime,c.scheduled_end_time AS endTime,
                (SELECT v.media_url FROM ad_creatives v WHERE v.campaign_id=c.campaign_id ORDER BY v.version_no DESC LIMIT 1) AS mediaUrl,
                (SELECT v.target_url FROM ad_creatives v WHERE v.campaign_id=c.campaign_id ORDER BY v.version_no DESC LIMIT 1) AS targetUrl,
                ct.total_value AS amount,
                COALESCE(SUM(m.impressions_count),0) AS impressions,
                COALESCE(SUM(m.clicks_count),0) AS clicks,
                COALESCE(SUM(m.invalid_clicks_count),0) AS invalidClicks
            FROM ad_campaigns c
            JOIN contracts ct ON ct.contract_id=c.contract_id
            JOIN companies cp ON cp.company_id=ct.company_id
            JOIN ad_slots s ON s.slot_id=ct.slot_id
            LEFT JOIN ad_creatives cr ON cr.campaign_id=c.campaign_id
            LEFT JOIN ad_metrics m ON m.creative_id=cr.creative_id
            WHERE (? OR ct.company_id=(SELECT company_id FROM users WHERE user_id=?))
            GROUP BY c.campaign_id,c.campaign_name,c.status,c.description,ct.contract_code,cp.company_name,
                     s.slot_name,s.position_code,s.width_px,s.height_px,c.scheduled_start_time,c.scheduled_end_time,ct.total_value
            ORDER BY c.campaign_id
            """, staff, principal.id());
    }

    public void recordImpression(Long creativeId) {
        if (creativeId == null) {
            return;
        }
        jdbc.update("""
            INSERT INTO ad_metrics (creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
            VALUES (?, CURRENT_DATE, 1, 0, 0, 0)
            ON DUPLICATE KEY UPDATE impressions_count = impressions_count + 1
            """, creativeId);
    }

    public String recordClickAndGetTargetUrl(Long creativeId) {
        if (creativeId == null) {
            return "/";
        }
        List<String> urls = jdbc.queryForList(
            "SELECT target_url FROM ad_creatives WHERE creative_id = ?",
            String.class,
            creativeId
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

    @PreAuthorize("hasAnyRole('AD_MANAGER','ADMINISTRATOR')")
    public Map<String, Object> toggleCampaignStatus(Long campaignId) {
        List<String> statuses = jdbc.queryForList(
            "SELECT status FROM ad_campaigns WHERE campaign_id = ?",
            String.class,
            campaignId
        );
        if (statuses.isEmpty()) {
            throw new IllegalArgumentException("Campaign not found: " + campaignId);
        }
        String currentStatus = statuses.get(0);
        String nextStatus;
        if ("ACTIVE".equalsIgnoreCase(currentStatus)) {
            nextStatus = "PAUSED";
        } else if ("PAUSED".equalsIgnoreCase(currentStatus)) {
            nextStatus = "ACTIVE";
        } else {
            throw new IllegalStateException("Cannot toggle campaign with status: " + currentStatus);
        }
        jdbc.update("UPDATE ad_campaigns SET status = ? WHERE campaign_id = ?", nextStatus, campaignId);
        return Map.of("campaignId", campaignId, "status", nextStatus);
    }
}
