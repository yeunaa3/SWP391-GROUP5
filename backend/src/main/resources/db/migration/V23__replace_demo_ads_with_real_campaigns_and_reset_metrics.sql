-- V23__replace_demo_ads_with_real_campaigns_and_reset_metrics.sql
-- 1. Reset all fake/simulated performance metrics and events so system tracks 100% real clicks and impressions
DELETE FROM ad_metrics;
DELETE FROM ad_events;

-- 2. Ensure all standard placement slots exist and are ACTIVE
INSERT INTO ad_slots (slot_name, position_code, page_scope, width_px, height_px, base_price, currency, status)
VALUES
    ('Homepage Hero', 'HOME_HERO', 'HOME', 1200, 300, 12000000, 'VND', 'ACTIVE'),
    ('Article Leaderboard', 'ARTICLE_TOP', 'ARTICLE', 970, 250, 8000000, 'VND', 'ACTIVE'),
    ('Article Sidebar', 'ARTICLE_SIDEBAR', 'ARTICLE', 300, 600, 5000000, 'VND', 'ACTIVE'),
    ('Header Banner', 'HEADER_BANNER', 'ALL', 1200, 300, 8000000, 'VND', 'ACTIVE'),
    ('In-Article Banner', 'IN_ARTICLE', 'ARTICLE', 1200, 300, 5000000, 'VND', 'ACTIVE'),
    ('End of Article Banner', 'END_OF_ARTICLE', 'ARTICLE', 1200, 300, 6000000, 'VND', 'ACTIVE')
ON DUPLICATE KEY UPDATE status = 'ACTIVE';

-- 3. Ensure approved company exists for hosting real campaigns
INSERT INTO companies(company_code, company_name, tax_code, email, phone, address, application_code, application_status, application_version, review_priority, submitted_at, review_note, status)
VALUES ('PLUSE-MEDIA-PARTNERS', 'The Pluse Media Network & Strategic Partners', '0109999888', 'partners@thepluse.vn', '0909999888', 'Tầng 12, Tòa nhà The Pluse, Hà Nội', 'APP-PLUSE-REAL-01', 'APPROVED', 1, 'NORMAL', CURRENT_TIMESTAMP(6), 'Đối tác truyền thông chiến lược chính thức', 'ACTIVE')
ON DUPLICATE KEY UPDATE application_status = 'APPROVED', status = 'ACTIVE';

-- Ensure demo user has an approved company linked
UPDATE users u
JOIN companies c ON c.company_code = 'PLUSE-MEDIA-PARTNERS'
SET u.company_id = c.company_id
WHERE u.username = 'business.demo' AND u.company_id IS NULL;

-- 4. Clean up / update existing demo campaigns to avoid lingering old demo names
UPDATE ad_creatives
SET title = 'The Pluse — Báo chí chất lượng cao',
    media_url = '/ads/thepluse.svg',
    target_url = 'https://swp391-group5-71mj.onrender.com/premium/packages',
    status = 'APPROVED'
WHERE media_url LIKE '%novalearn%' OR title LIKE '%NovaLearn%';

UPDATE ad_creatives
SET title = 'On-Lies Game — Trò chơi trực tuyến kịch tính',
    media_url = '/ads/onliesgame.svg',
    target_url = 'https://on-lies-game.onrender.com/',
    status = 'APPROVED'
WHERE media_url LIKE '%greenfarm%' OR title LIKE '%GreenFarm%';

UPDATE ad_creatives
SET title = 'Google Gemini — Trợ lý AI thế hệ mới',
    media_url = '/ads/gemini.svg',
    target_url = 'https://gemini.google.com/',
    status = 'APPROVED'
WHERE media_url LIKE '%clouddesk%' OR title LIKE '%CloudDesk%';

UPDATE ad_campaigns
SET campaign_name = 'Chiến dịch Báo chí Bản quyền The Pluse'
WHERE campaign_name LIKE '%NovaLearn%' OR campaign_name LIKE '%Nền tảng Tri thức The Pulse%';

UPDATE ad_campaigns
SET campaign_name = 'Chiến dịch Quảng bá On-Lies Game'
WHERE campaign_name LIKE '%GreenFarm%';

UPDATE ad_campaigns
SET campaign_name = 'Chiến dịch Trợ lý AI Google Gemini'
WHERE campaign_name LIKE '%CloudDesk%';

-- 5. Insert active contracts for the 3 real campaigns if not present
-- Campaign 1: The Pluse
INSERT INTO contracts(contract_code, contract_name, company_id, b2b_package_id, slot_id,
    package_code_snapshot, package_name_snapshot, package_price_snapshot, duration_days_snapshot,
    impressions_quota_snapshot, slot_name_snapshot, slot_position_snapshot, total_value,
    start_at, end_at, payment_status, status)
SELECT 
    'CT-THEPLUSE-2026', 
    'Hợp đồng Quảng bá Nền tảng Báo chí The Pluse', 
    c.company_id, 
    COALESCE(p.b2b_package_id, 1), 
    s.slot_id,
    COALESCE(p.code, 'GROWTH_500K'), 
    COALESCE(p.name, 'Gói Tăng trưởng 500K lượt xem'), 
    COALESCE(p.price, 55000000), 
    365, 
    1000000, 
    s.slot_name, 
    s.position_code, 
    COALESCE(p.price, 55000000),
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) + INTERVAL 365 DAY, 
    'PAID', 
    'ACTIVE'
FROM companies c
JOIN ad_slots s ON s.position_code = 'HOME_HERO'
LEFT JOIN b2b_packages p ON p.code = 'GROWTH_500K'
WHERE c.company_code = 'PLUSE-MEDIA-PARTNERS'
AND NOT EXISTS (SELECT 1 FROM contracts WHERE contract_code = 'CT-THEPLUSE-2026')
LIMIT 1;

-- Campaign 2: On-Lies Game
INSERT INTO contracts(contract_code, contract_name, company_id, b2b_package_id, slot_id,
    package_code_snapshot, package_name_snapshot, package_price_snapshot, duration_days_snapshot,
    impressions_quota_snapshot, slot_name_snapshot, slot_position_snapshot, total_value,
    start_at, end_at, payment_status, status)
SELECT 
    'CT-ONLIES-2026', 
    'Hợp đồng Quảng cáo Trò chơi On-Lies Game', 
    c.company_id, 
    COALESCE(p.b2b_package_id, 1), 
    s.slot_id,
    COALESCE(p.code, 'GROWTH_500K'), 
    COALESCE(p.name, 'Gói Tăng trưởng 500K lượt xem'), 
    COALESCE(p.price, 55000000), 
    365, 
    1000000, 
    s.slot_name, 
    s.position_code, 
    COALESCE(p.price, 55000000),
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) + INTERVAL 365 DAY, 
    'PAID', 
    'ACTIVE'
FROM companies c
JOIN ad_slots s ON s.position_code = 'ARTICLE_TOP'
LEFT JOIN b2b_packages p ON p.code = 'GROWTH_500K'
WHERE c.company_code = 'PLUSE-MEDIA-PARTNERS'
AND NOT EXISTS (SELECT 1 FROM contracts WHERE contract_code = 'CT-ONLIES-2026')
LIMIT 1;

-- Campaign 3: Google Gemini
INSERT INTO contracts(contract_code, contract_name, company_id, b2b_package_id, slot_id,
    package_code_snapshot, package_name_snapshot, package_price_snapshot, duration_days_snapshot,
    impressions_quota_snapshot, slot_name_snapshot, slot_position_snapshot, total_value,
    start_at, end_at, payment_status, status)
SELECT 
    'CT-GEMINI-2026', 
    'Hợp đồng Đối tác Trí tuệ Nhân tạo Google Gemini', 
    c.company_id, 
    COALESCE(p.b2b_package_id, 1), 
    s.slot_id,
    COALESCE(p.code, 'GROWTH_500K'), 
    COALESCE(p.name, 'Gói Tăng trưởng 500K lượt xem'), 
    COALESCE(p.price, 55000000), 
    365, 
    1000000, 
    s.slot_name, 
    s.position_code, 
    COALESCE(p.price, 55000000),
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) + INTERVAL 365 DAY, 
    'PAID', 
    'ACTIVE'
FROM companies c
JOIN ad_slots s ON s.position_code = 'ARTICLE_SIDEBAR'
LEFT JOIN b2b_packages p ON p.code = 'GROWTH_500K'
WHERE c.company_code = 'PLUSE-MEDIA-PARTNERS'
AND NOT EXISTS (SELECT 1 FROM contracts WHERE contract_code = 'CT-GEMINI-2026')
LIMIT 1;

-- 6. Insert active campaigns for contracts
INSERT INTO ad_campaigns(contract_id, campaign_name, description, impression_limit,
    scheduled_start_time, scheduled_end_time, submitted_at, approved_at, activated_at, status, created_by)
SELECT 
    c.contract_id, 
    'Chiến dịch Báo chí Bản quyền The Pluse', 
    'Quảng bá trải nghiệm đọc báo tập trung và gói hội viên The Pluse', 
    1000000,
    c.start_at, 
    c.end_at, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'ACTIVE',
    COALESCE((SELECT user_id FROM users WHERE username = 'business.demo' LIMIT 1), 1)
FROM contracts c
WHERE c.contract_code = 'CT-THEPLUSE-2026'
AND NOT EXISTS (SELECT 1 FROM ad_campaigns WHERE contract_id = c.contract_id)
LIMIT 1;

INSERT INTO ad_campaigns(contract_id, campaign_name, description, impression_limit,
    scheduled_start_time, scheduled_end_time, submitted_at, approved_at, activated_at, status, created_by)
SELECT 
    c.contract_id, 
    'Chiến dịch Quảng bá On-Lies Game', 
    'Trò chơi đấu trí trực tuyến thời gian thực đầy kịch tính', 
    1000000,
    c.start_at, 
    c.end_at, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'ACTIVE',
    COALESCE((SELECT user_id FROM users WHERE username = 'business.demo' LIMIT 1), 1)
FROM contracts c
WHERE c.contract_code = 'CT-ONLIES-2026'
AND NOT EXISTS (SELECT 1 FROM ad_campaigns WHERE contract_id = c.contract_id)
LIMIT 1;

INSERT INTO ad_campaigns(contract_id, campaign_name, description, impression_limit,
    scheduled_start_time, scheduled_end_time, submitted_at, approved_at, activated_at, status, created_by)
SELECT 
    c.contract_id, 
    'Chiến dịch Trợ lý AI Google Gemini', 
    'Trợ lý trí tuệ nhân tạo thế hệ mới đồng hành sáng tạo', 
    1000000,
    c.start_at, 
    c.end_at, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'ACTIVE',
    COALESCE((SELECT user_id FROM users WHERE username = 'business.demo' LIMIT 1), 1)
FROM contracts c
WHERE c.contract_code = 'CT-GEMINI-2026'
AND NOT EXISTS (SELECT 1 FROM ad_campaigns WHERE contract_id = c.contract_id)
LIMIT 1;

-- 7. Insert approved creatives
INSERT INTO ad_creatives(campaign_id, version_no, creative_type, title, media_url, target_url,
    mime_type, file_size, width_px, height_px, submitted_at, approved_at, status)
SELECT 
    a.campaign_id, 1, 'IMAGE', 
    'The Pluse — Báo chí chất lượng cao', 
    '/ads/thepluse.svg', 
    'https://swp391-group5-71mj.onrender.com/premium/packages',
    'image/svg+xml', 4096, 1200, 300,
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'APPROVED'
FROM ad_campaigns a
JOIN contracts c ON c.contract_id = a.contract_id
WHERE c.contract_code = 'CT-THEPLUSE-2026'
AND NOT EXISTS (SELECT 1 FROM ad_creatives WHERE campaign_id = a.campaign_id)
LIMIT 1;

INSERT INTO ad_creatives(campaign_id, version_no, creative_type, title, media_url, target_url,
    mime_type, file_size, width_px, height_px, submitted_at, approved_at, status)
SELECT 
    a.campaign_id, 1, 'IMAGE', 
    'On-Lies Game — Trò chơi trực tuyến kịch tính', 
    '/ads/onliesgame.svg', 
    'https://on-lies-game.onrender.com/',
    'image/svg+xml', 4096, 1200, 300,
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'APPROVED'
FROM ad_campaigns a
JOIN contracts c ON c.contract_id = a.contract_id
WHERE c.contract_code = 'CT-ONLIES-2026'
AND NOT EXISTS (SELECT 1 FROM ad_creatives WHERE campaign_id = a.campaign_id)
LIMIT 1;

INSERT INTO ad_creatives(campaign_id, version_no, creative_type, title, media_url, target_url,
    mime_type, file_size, width_px, height_px, submitted_at, approved_at, status)
SELECT 
    a.campaign_id, 1, 'IMAGE', 
    'Google Gemini — Trợ lý AI thế hệ mới', 
    '/ads/gemini.svg', 
    'https://gemini.google.com/',
    'image/svg+xml', 4096, 1200, 300,
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY, 
    'APPROVED'
FROM ad_campaigns a
JOIN contracts c ON c.contract_id = a.contract_id
WHERE c.contract_code = 'CT-GEMINI-2026'
AND NOT EXISTS (SELECT 1 FROM ad_creatives WHERE campaign_id = a.campaign_id)
LIMIT 1;
