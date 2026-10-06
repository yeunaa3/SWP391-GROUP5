package com.group5.premiumnews.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@Profile("local")
public class LocalAdvertisingDataInitializer {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    public LocalAdvertisingDataInitializer(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
    }
    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        transactions.executeWithoutResult(status -> {
            jdbc.update("""
                INSERT IGNORE INTO companies(company_code,company_name,tax_code,email,phone,address,
                    application_code,application_status,status)
                VALUES ('DEMO-PARTNER','Pulse Partners — dữ liệu thử nghiệm','DEMO-NOT-A-TAX-ID',
                    'demo@example.com','0000000000','Demo local','DEMO-APP-001','APPROVED','ACTIVE')
                """);
            Long company = jdbc.queryForObject("SELECT company_id FROM companies WHERE company_code='DEMO-PARTNER'", Long.class);
            Long business = jdbc.queryForObject("SELECT user_id FROM users WHERE username='business.demo'", Long.class);
            jdbc.update("UPDATE users SET company_id=? WHERE user_id=? AND company_id IS NULL", company, business);
            String[][] campaigns = {
                {"HOME_HERO", "DEMO-AD-001", "NovaLearn — Học kỹ năng số", "novalearn"},
                {"ARTICLE_TOP", "DEMO-AD-002", "GreenFarm — Nông nghiệp thông minh", "greenfarm"},
                {"ARTICLE_SIDEBAR", "DEMO-AD-003", "CloudDesk — Không gian làm việc", "clouddesk"}
            };
            for (String[] campaign : campaigns) {
                jdbc.update("""
                    INSERT IGNORE INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,
                        package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,
                        impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,
                        start_at,end_at,payment_status,status)
                    SELECT ?,?, ?,p.b2b_package_id,s.slot_id,p.code,p.name,p.price,p.duration_days,p.impressions_quota,
                        s.slot_name,s.position_code,p.price,CURRENT_TIMESTAMP - INTERVAL 7 DAY,
                        CURRENT_TIMESTAMP + INTERVAL 90 DAY,'PAID','ACTIVE'
                    FROM b2b_packages p JOIN ad_slots s ON s.position_code=? WHERE p.code='AWARENESS_100K'
                    """, campaign[1], "Hợp đồng mẫu: " + campaign[2], company, campaign[0]);
                Long contract = jdbc.queryForObject("SELECT contract_id FROM contracts WHERE contract_code=?", Long.class, campaign[1]);
                Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM ad_campaigns WHERE contract_id=?", Integer.class, contract);
                if (existing != null && existing > 0) continue;
                jdbc.update("""
                    INSERT INTO ad_campaigns(contract_id,campaign_name,description,impression_limit,
                        scheduled_start_time,scheduled_end_time,activated_at,approved_at,status,created_by)
                    VALUES (?,?, 'DEMO: thương hiệu, hợp đồng và chỉ số đều giả lập cho bài tập.',100000,
                        CURRENT_TIMESTAMP - INTERVAL 7 DAY,CURRENT_TIMESTAMP + INTERVAL 90 DAY,
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'ACTIVE',?)
                    """, contract, campaign[2], business);
                Long id = jdbc.queryForObject("SELECT campaign_id FROM ad_campaigns WHERE contract_id=?", Long.class, contract);
                jdbc.update("""
                    INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,target_url,
                        mime_type,file_size,width_px,height_px,approved_at,status)
                    SELECT ?,1,'IMAGE',?, ?, ?,
                        'image/svg+xml',2048,s.width_px,s.height_px,CURRENT_TIMESTAMP,'APPROVED'
                    FROM ad_slots s WHERE s.position_code=?
                    """,
                    id, campaign[2], "/ads/" + campaign[3] + ".svg", "/advertising-demo?brand=" + campaign[3], campaign[0]);
                Long creative = jdbc.queryForObject("SELECT creative_id FROM ad_creatives WHERE campaign_id=?", Long.class, id);
                for (int day = 1; day <= 7; day++) {
                    jdbc.update("""
                        INSERT IGNORE INTO ad_metrics(creative_id,metric_date,impressions_count,clicks_count)
                        VALUES (?,CURRENT_DATE - INTERVAL ? DAY,?,?)
                        """, creative, day, 1800 + day * 237, 42 + day * 8);
                }
            }
        });
    }
}
