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
                    application_code,application_status,application_version,review_priority,submitted_at,status)
                VALUES ('DEMO-PARTNER','The Pluse Media Network & Strategic Partners','0109999888',
                    'partners@thepluse.vn','0909999888','Tòa nhà The Pluse, Hà Nội','DEMO-APP-001','APPROVED',1,'NORMAL',CURRENT_TIMESTAMP(6),'ACTIVE')
                """);
            jdbc.update("""
                INSERT IGNORE INTO companies(company_code,company_name,tax_code,email,phone,address,
                    application_code,application_status,application_version,review_priority,submitted_at,status)
                VALUES
                    ('DEMO-PENDING','Công ty Nông nghiệp Xanh','0000000002','pending@example.com','0900000002',
                     'Hà Nội','DEMO-APP-002','PENDING_REVIEW',1,'NORMAL',CURRENT_TIMESTAMP(6) - INTERVAL 2 DAY,'ACTIVE'),
                    ('DEMO-RESUBMITTED','Công ty Công nghệ Việt','0000000003','resubmitted@example.com','0900000003',
                     'Đà Nẵng','DEMO-APP-003','RESUBMITTED',2,'HIGH',CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY,'ACTIVE')
                """);
            jdbc.update("""
                INSERT IGNORE INTO company_application_versions(company_id,application_version,company_name,
                    tax_code,email,phone,address,billing_address,submitted_at)
                SELECT company_id,application_version,company_name,tax_code,email,phone,address,
                    billing_address,submitted_at FROM companies
                WHERE company_code IN ('DEMO-PARTNER','DEMO-PENDING','DEMO-RESUBMITTED')
                """);
            Long company = jdbc.queryForObject("SELECT company_id FROM companies WHERE company_code='DEMO-PARTNER'", Long.class);
            Long business = jdbc.queryForObject("SELECT user_id FROM users WHERE username='business.demo'", Long.class);
            jdbc.update("UPDATE users SET company_id=? WHERE user_id=? AND company_id IS NULL", company, business);

            String[][] campaigns = {
                {"HOME_HERO", "DEMO-AD-001", "The Pluse — Báo chí chất lượng cao", "thepluse", "https://swp391-group5-71mj.onrender.com/premium/packages"},
                {"ARTICLE_TOP", "DEMO-AD-002", "On-Lies Game — Trò chơi trực tuyến", "onliesgame", "https://on-lies-game.onrender.com/"},
                {"ARTICLE_SIDEBAR", "DEMO-AD-003", "Google Gemini — Trợ lý AI thế hệ mới", "gemini", "https://gemini.google.com/"}
            };

            for (String[] campaign : campaigns) {
                jdbc.update("""
                    INSERT IGNORE INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,
                        package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,
                        impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,
                        start_at,end_at,payment_status,status)
                    SELECT ?,?, ?,p.b2b_package_id,s.slot_id,p.code,p.name,p.price,p.duration_days,p.impressions_quota,
                        s.slot_name,s.position_code,p.price,CURRENT_TIMESTAMP - INTERVAL 1 DAY,
                        CURRENT_TIMESTAMP + INTERVAL 365 DAY,'PAID','ACTIVE'
                    FROM b2b_packages p JOIN ad_slots s ON s.position_code=? WHERE p.code='AWARENESS_100K'
                    """, campaign[1], "Hợp đồng: " + campaign[2], company, campaign[0]);

                Long contract = jdbc.queryForObject("SELECT contract_id FROM contracts WHERE contract_code=?", Long.class, campaign[1]);
                Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM ad_campaigns WHERE contract_id=?", Integer.class, contract);
                if (existing != null && existing > 0) continue;

                jdbc.update("""
                    INSERT INTO ad_campaigns(contract_id,campaign_name,description,impression_limit,
                        scheduled_start_time,scheduled_end_time,activated_at,approved_at,status,created_by)
                    VALUES (?,?, 'Chiến dịch quảng cáo chính thức phân phối trên hệ thống The Pluse.',500000,
                        CURRENT_TIMESTAMP - INTERVAL 1 DAY,CURRENT_TIMESTAMP + INTERVAL 365 DAY,
                        CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'ACTIVE',?)
                    """, contract, campaign[2], business);

                Long id = jdbc.queryForObject("SELECT campaign_id FROM ad_campaigns WHERE contract_id=?", Long.class, contract);
                jdbc.update("""
                    INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,target_url,
                        mime_type,file_size,width_px,height_px,approved_at,status)
                    SELECT ?,1,'IMAGE',?, ?, ?,
                        'image/svg+xml',4096,s.width_px,s.height_px,CURRENT_TIMESTAMP,'APPROVED'
                    FROM ad_slots s WHERE s.position_code=?
                    """,
                    id, campaign[2], "/ads/" + campaign[3] + ".svg", campaign[4], campaign[0]);
                // Lưu ý: Không chèn fake metrics vào ad_metrics để đảm bảo toàn bộ số liệu click và impression đều là số liệu thật 100%.
            }
        });
    }
}
