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
                s.slot_name AS slotName,(SELECT v.media_url FROM ad_creatives v WHERE v.campaign_id=c.campaign_id ORDER BY v.version_no DESC LIMIT 1) AS mediaUrl,ct.total_value AS amount,
                COALESCE(SUM(m.impressions_count),0) AS impressions,COALESCE(SUM(m.clicks_count),0) AS clicks
            FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
            JOIN ad_slots s ON s.slot_id=ct.slot_id
            LEFT JOIN ad_creatives cr ON cr.campaign_id=c.campaign_id
            LEFT JOIN ad_metrics m ON m.creative_id=cr.creative_id
            WHERE (? OR ct.company_id=(SELECT company_id FROM users WHERE user_id=?))
            GROUP BY c.campaign_id,c.campaign_name,c.status,c.description,ct.contract_code,s.slot_name,ct.total_value
            ORDER BY c.campaign_id
            """, staff, principal.id());
    }
}
