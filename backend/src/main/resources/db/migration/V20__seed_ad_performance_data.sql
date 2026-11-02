-- V20__seed_ad_performance_data.sql
-- Seed baseline demo data for B2B Business, Active Ad Contracts, Campaigns and Daily Performance Metrics

-- 1. Ensure approved demo company exists
INSERT INTO companies(company_code, company_name, tax_code, email, phone, address, application_code, application_status, application_version, review_priority, submitted_at, review_note)
SELECT 'THE-PLUSE-DEMO-CO', 'Tập đoàn Công nghệ & Truyền thông The Pulse', '0102030405', 'business@thepulse.local', '0901234567', 'Tầng 18, Tòa nhà Landmark 72, Hà Nội', 'APP-PULSE-001', 'APPROVED', 1, 'NORMAL', CURRENT_TIMESTAMP(6), 'Hồ sơ doanh nghiệp mẫu đã được phê duyệt'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE company_code = 'THE-PLUSE-DEMO-CO');

-- 2. Link business.demo user to the approved company if user exists
UPDATE users u
JOIN companies c ON c.company_code = 'THE-PLUSE-DEMO-CO'
SET u.company_id = c.company_id
WHERE u.username = 'business.demo' AND u.company_id IS NULL;

-- 3. Ensure active B2B contract exists for the demo company
INSERT INTO contracts(contract_code, contract_name, company_id, b2b_package_id, slot_id,
    package_code_snapshot, package_name_snapshot, package_price_snapshot, duration_days_snapshot,
    impressions_quota_snapshot, slot_name_snapshot, slot_position_snapshot, total_value,
    start_at, end_at, payment_status, status)
SELECT 
    'CT-PLUSE-2026-ACTIVE', 
    'Hợp đồng Quảng cáo Trang chủ Q4/2026', 
    c.company_id, 
    COALESCE(p.b2b_package_id, 1), 
    s.slot_id,
    COALESCE(p.code, 'GROWTH_500K'), 
    COALESCE(p.name, 'Gói Tăng trưởng 500K lượt xem'), 
    COALESCE(p.price, 55000000), 
    COALESCE(p.duration_days, 60), 
    COALESCE(p.impressions_quota, 500000), 
    s.slot_name, 
    s.position_code, 
    COALESCE(p.price, 55000000),
    CURRENT_TIMESTAMP(6) - INTERVAL 14 DAY, 
    CURRENT_TIMESTAMP(6) + INTERVAL 45 DAY, 
    'PAID', 
    'ACTIVE'
FROM companies c
JOIN ad_slots s ON s.position_code = 'HOME_HERO'
LEFT JOIN b2b_packages p ON p.code = 'GROWTH_500K'
WHERE c.company_code = 'THE-PLUSE-DEMO-CO'
AND NOT EXISTS (SELECT 1 FROM contracts WHERE contract_code = 'CT-PLUSE-2026-ACTIVE')
LIMIT 1;

-- 4. Ensure active campaign exists for the active contract
INSERT INTO ad_campaigns(contract_id, campaign_name, description, impression_limit,
    scheduled_start_time, scheduled_end_time, submitted_at, approved_at, activated_at, status, created_by)
SELECT 
    c.contract_id, 
    'Chiến dịch Quảng bá Nền tảng Tri thức The Pulse', 
    'Chiến dịch tiếp thị đa kênh tăng trưởng nhận diện thương hiệu Q4', 
    250000,
    c.start_at, 
    c.end_at, 
    CURRENT_TIMESTAMP(6) - INTERVAL 14 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 13 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 13 DAY, 
    'ACTIVE',
    COALESCE((SELECT user_id FROM users WHERE username = 'business.demo' LIMIT 1), 1)
FROM contracts c
WHERE c.contract_code = 'CT-PLUSE-2026-ACTIVE'
AND NOT EXISTS (SELECT 1 FROM ad_campaigns WHERE contract_id = c.contract_id AND campaign_name = 'Chiến dịch Quảng bá Nền tảng Tri thức The Pulse')
LIMIT 1;

-- 5. Ensure approved creative banner exists for the active campaign
INSERT INTO ad_creatives(campaign_id, version_no, creative_type, title, media_url, target_url,
    mime_type, file_size, width_px, height_px, submitted_at, approved_at, status)
SELECT 
    a.campaign_id, 
    1, 
    'IMAGE', 
    'Banner The Pulse Education', 
    '/ads/novalearn.svg', 
    'https://thepulse.vn/knowledge',
    'image/svg+xml', 
    4096, 
    s.width_px, 
    s.height_px,
    CURRENT_TIMESTAMP(6) - INTERVAL 14 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 13 DAY, 
    'APPROVED'
FROM ad_campaigns a
JOIN contracts c ON c.contract_id = a.contract_id
JOIN ad_slots s ON s.slot_id = c.slot_id
WHERE c.contract_code = 'CT-PLUSE-2026-ACTIVE'
AND NOT EXISTS (SELECT 1 FROM ad_creatives WHERE campaign_id = a.campaign_id)
LIMIT 1;

-- 6. Insert 14-day aggregated daily metrics into ad_metrics
INSERT INTO ad_metrics(creative_id, metric_date, impressions_count, clicks_count, invalid_clicks_count, delivery_errors_count)
SELECT 
    cr.creative_id,
    CURRENT_DATE - INTERVAL d.n DAY,
    1850 + (d.n * 142) + MOD(d.n * 67, 193),
    54 + (d.n * 6) + MOD(d.n * 13, 19),
    MOD(d.n * 2, 4),
    0
FROM ad_creatives cr
JOIN ad_campaigns a ON a.campaign_id = cr.campaign_id
JOIN contracts c ON c.contract_id = a.contract_id
JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 
    UNION ALL SELECT 12 UNION ALL SELECT 13
) d
WHERE c.contract_code = 'CT-PLUSE-2026-ACTIVE'
AND NOT EXISTS (
    SELECT 1 FROM ad_metrics x 
    WHERE x.creative_id = cr.creative_id AND x.metric_date = CURRENT_DATE - INTERVAL d.n DAY
);
