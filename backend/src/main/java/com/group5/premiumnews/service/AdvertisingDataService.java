package com.group5.premiumnews.service;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdvertisingDataService {
    private final JdbcTemplate jdbc;
    public AdvertisingDataService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> availability() {
        // Trả về các khoảng thời gian đã có hợp đồng Active đã thanh toán hoặc đang giữ chỗ chưa hết hạn
        return jdbc.queryForList("""
            SELECT slot_id AS slotId, start_at AS startAt, end_at AS endAt
            FROM contracts 
            WHERE end_at > CURRENT_TIMESTAMP
              AND (
                  (status = 'ACTIVE' AND payment_status = 'PAID')
                  OR (status IN ('ACCEPTED', 'PENDING_PAYMENT') AND reservation_expires_at > CURRENT_TIMESTAMP)
              )
            ORDER BY start_at
            """);
    }

    @PreAuthorize("hasAnyRole('BUSINESS','AD_MANAGER','ADMINISTRATOR')")
    public List<Map<String, Object>> performance(AuthenticatedUserPrincipal principal) {
        boolean staff = principal.authorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_AD_MANAGER") || a.getAuthority().equals("ROLE_ADMINISTRATOR"));
        return jdbc.queryForList("""
            SELECT c.campaign_id AS campaignId,c.campaign_name AS campaignName,DATE(e.occurred_at) AS metricDate,
                SUM(e.event_type='IMPRESSION' AND e.is_valid=TRUE) AS impressions,SUM(e.event_type='CLICK' AND e.is_valid=TRUE) AS clicks,
                SUM(e.event_type='CLICK' AND e.is_valid=FALSE) AS invalidClicks
            FROM ad_events e JOIN ad_campaigns c ON c.campaign_id=e.campaign_id JOIN contracts ct ON ct.contract_id=c.contract_id
            WHERE (? OR ct.company_id=(SELECT company_id FROM users WHERE user_id=?))
            GROUP BY c.campaign_id,c.campaign_name,DATE(e.occurred_at)
            ORDER BY metricDate,c.campaign_id
            """, staff, principal.id());
    }

    /** Chọn creative đủ điều kiện theo lịch, partnership, quota và context nội dung/thiết bị/vùng trình duyệt. */
    public List<Map<String, Object>> banners(String position,String device,String country,Long article) {
        return jdbc.queryForList("""
            SELECT cr.creative_id AS id,cr.title,cr.media_url AS mediaUrl,cr.target_url AS targetUrl,
                s.position_code AS position,c.campaign_name AS campaignName,cr.creative_type AS creativeType,
                cr.mime_type AS mimeType
            FROM ad_creatives cr JOIN ad_campaigns c ON c.campaign_id=cr.campaign_id
            JOIN contracts ct ON ct.contract_id=c.contract_id JOIN ad_slots s ON s.slot_id=ct.slot_id
            JOIN companies cp ON cp.company_id=ct.company_id
            LEFT JOIN ad_targeting t ON t.campaign_id=c.campaign_id
            WHERE s.position_code=? AND s.status='ACTIVE' AND cr.status='APPROVED'
                AND cp.application_status='APPROVED'
                AND c.status='ACTIVE' AND ct.status='ACTIVE' AND ct.payment_status='PAID'
                AND c.scheduled_start_time<=CURRENT_TIMESTAMP AND c.scheduled_end_time>CURRENT_TIMESTAMP
                AND ct.start_at<=CURRENT_TIMESTAMP AND ct.end_at>CURRENT_TIMESTAMP
                AND cr.version_no=(SELECT MAX(v.version_no) FROM ad_creatives v
                    WHERE v.campaign_id=c.campaign_id AND v.status='APPROVED')
                AND (t.device_type IS NULL OR t.device_type='ALL' OR t.device_type=?)
                AND (t.geo_scope IS NULL OR t.geo_scope='' OR t.geo_scope='ALL' OR FIND_IN_SET(?,t.geo_scope)>0)
                AND (NOT EXISTS(SELECT 1 FROM ad_targeting_categories x WHERE x.target_id=t.target_id)
                    OR EXISTS(SELECT 1 FROM ad_targeting_categories x JOIN article_categories a ON a.category_id=x.category_id WHERE x.target_id=t.target_id AND a.article_id=?))
                AND (NOT EXISTS(SELECT 1 FROM ad_targeting_tags x WHERE x.target_id=t.target_id)
                    OR EXISTS(SELECT 1 FROM ad_targeting_tags x JOIN article_tags atg ON atg.tag_id=x.tag_id WHERE x.target_id=t.target_id AND atg.article_id=?))
                AND (c.impression_limit IS NULL OR (SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id=c.campaign_id AND e.event_type='IMPRESSION' AND e.is_valid=TRUE)<c.impression_limit)
                AND (SELECT COUNT(*) FROM ad_events e JOIN ad_campaigns ec ON ec.campaign_id=e.campaign_id WHERE ec.contract_id=ct.contract_id AND e.event_type='IMPRESSION' AND e.is_valid=TRUE)<ct.impressions_quota_snapshot
            ORDER BY cr.creative_id LIMIT 3
            """, position,device,country,article,article);
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

    /** Raw event chỉ ghi khi campaign còn được phép phát; khóa contract để quota không vượt bởi request đồng thời. */
    @Transactional
    public String recordEvent(Long creativeId,String type,String session) {
        if(creativeId==null)return "/";
        var rows=jdbc.queryForList("SELECT cr.target_url,c.campaign_id,ct.slot_id,ct.contract_id FROM ad_creatives cr JOIN ad_campaigns c ON c.campaign_id=cr.campaign_id JOIN contracts ct ON ct.contract_id=c.contract_id JOIN companies cp ON cp.company_id=ct.company_id JOIN ad_slots s ON s.slot_id=ct.slot_id WHERE cr.creative_id=? AND cr.status='APPROVED' AND c.status='ACTIVE' AND cp.application_status='APPROVED' AND ct.status='ACTIVE' AND ct.payment_status='PAID' AND s.status='ACTIVE' AND c.scheduled_start_time<=CURRENT_TIMESTAMP(6) AND c.scheduled_end_time>CURRENT_TIMESTAMP(6) AND ct.start_at<=CURRENT_TIMESTAMP(6) AND ct.end_at>CURRENT_TIMESTAMP(6) FOR UPDATE",creativeId);
        if(rows.isEmpty())return "/";var row=rows.getFirst();
        String url=(String)row.get("target_url");CampaignWorkflowService.validateUrl(url);
        String fingerprint=hash(session+":"+creativeId+":"+(System.currentTimeMillis()/30000));
        if(jdbc.queryForObject("SELECT COUNT(*) FROM ad_events WHERE request_fingerprint=? AND event_type=?",Long.class,fingerprint,type)>0)return url;
        if("IMPRESSION".equals(type)){
            var quota=jdbc.queryForMap("SELECT c.impression_limit,ct.impressions_quota_snapshot,(SELECT COUNT(*) FROM ad_events e WHERE e.campaign_id=c.campaign_id AND e.event_type='IMPRESSION' AND e.is_valid=TRUE) campaign_count,(SELECT COUNT(*) FROM ad_events e JOIN ad_campaigns x ON x.campaign_id=e.campaign_id WHERE x.contract_id=ct.contract_id AND e.event_type='IMPRESSION' AND e.is_valid=TRUE) contract_count FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id WHERE c.campaign_id=?",row.get("campaign_id"));
            if(((Number)quota.get("contract_count")).longValue()>=((Number)quota.get("impressions_quota_snapshot")).longValue()||(quota.get("impression_limit")!=null&&((Number)quota.get("campaign_count")).longValue()>=((Number)quota.get("impression_limit")).longValue()))return url;
        }
        jdbc.update("INSERT INTO ad_events(event_type,campaign_id,creative_id,slot_id,request_fingerprint) VALUES(?,?,?,?,?)",type,row.get("campaign_id"),creativeId,row.get("slot_id"),fingerprint);
        // Giữ bảng aggregate tương thích báo cáo hiện có; dự báo/dashboard đọc raw để không trộn dữ liệu fixture.
        jdbc.update("INSERT INTO ad_metrics(creative_id,metric_date,impressions_count,clicks_count) VALUES(?,CURRENT_DATE,?,?) ON DUPLICATE KEY UPDATE impressions_count=impressions_count+VALUES(impressions_count),clicks_count=clicks_count+VALUES(clicks_count)",creativeId,"IMPRESSION".equals(type)?1:0,"CLICK".equals(type)?1:0);
        return url;
    }

    /** Băm session để chống đếm lặp trong cửa sổ 30 giây; không lưu ID session/IP thô vào DB. */
    private String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}

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
