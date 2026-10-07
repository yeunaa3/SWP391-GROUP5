-- Fictional fixtures for The Pluse, NOT real legal entities, money or analytics.
-- Never overwrite test actions on restart; no deletes and no broad updates.
INSERT INTO companies(company_code,company_name,tax_code,email,phone,address,application_code,application_status,submitted_at,review_note)
SELECT 'TEST-PLUSE-APPROVED','[TEST] The Pluse Education','0000000001','education@example.com','0000000001','Du lieu gia lap - Ha Noi','TEST-APP-001','APPROVED',CURRENT_TIMESTAMP,'[TEST] Ho so mau da duyet'
WHERE NOT EXISTS(SELECT 1 FROM companies WHERE company_code='TEST-PLUSE-APPROVED');
INSERT INTO companies(company_code,company_name,tax_code,email,phone,address,application_code,application_status,submitted_at,review_note)
SELECT 'TEST-PLUSE-PENDING','[TEST] The Pluse Agriculture','0000000002','agriculture@example.com','0000000002','Du lieu gia lap - Ha Tinh','TEST-APP-002','PENDING_REVIEW',CURRENT_TIMESTAMP,'[TEST] Ho so mau cho duyet; tai lieu can tai len thu'
WHERE NOT EXISTS(SELECT 1 FROM companies WHERE company_code='TEST-PLUSE-PENDING');
INSERT INTO companies(company_code,company_name,tax_code,email,phone,address,application_code,application_status,submitted_at,review_note)
SELECT 'TEST-PLUSE-REVISION','[TEST] The Pluse Technology','0000000003','technology@example.com','0000000003','Du lieu gia lap - Da Nang','TEST-APP-003','NEEDS_REVISION',CURRENT_TIMESTAMP,'[TEST] Bo sung giay dang ky kinh doanh va dia chi thanh toan'
WHERE NOT EXISTS(SELECT 1 FROM companies WHERE company_code='TEST-PLUSE-REVISION');
INSERT INTO companies(company_code,company_name,tax_code,email,phone,address,application_code,application_status,submitted_at,review_note)
SELECT 'TEST-PLUSE-REJECTED','[TEST] The Pluse Retail','0000000004','retail@example.com','0000000004','Du lieu gia lap - TP HCM','TEST-APP-004','REJECTED',CURRENT_TIMESTAMP,'[TEST] Ho so mau bi tu choi: thong tin chua hop le'
WHERE NOT EXISTS(SELECT 1 FROM companies WHERE company_code='TEST-PLUSE-REJECTED');

UPDATE users u JOIN companies c ON c.company_code=CASE u.username
    WHEN 'business.demo' THEN 'TEST-PLUSE-APPROVED'
    WHEN 'business.pending.demo' THEN 'TEST-PLUSE-PENDING'
    WHEN 'business.revision.demo' THEN 'TEST-PLUSE-REVISION'
    WHEN 'business.rejected.demo' THEN 'TEST-PLUSE-REJECTED' END
SET u.company_id=c.company_id
WHERE u.company_id IS NULL AND u.email=CONCAT(u.username,'@thepluse.example');

-- Five contract states; the first allows creating campaigns without real payment.
INSERT INTO contracts(contract_code,contract_name,company_id,b2b_package_id,slot_id,
    package_code_snapshot,package_name_snapshot,package_price_snapshot,duration_days_snapshot,
    impressions_quota_snapshot,slot_name_snapshot,slot_position_snapshot,total_value,
    start_at,end_at,payment_status,status)
SELECT f.code,CONCAT('[TEST] The Pluse - ',f.state),c.company_id,p.b2b_package_id,s.slot_id,
    p.code,p.name,p.price,p.duration_days,p.impressions_quota,s.slot_name,s.position_code,p.price,
    CURRENT_TIMESTAMP - INTERVAL 3 DAY,CURRENT_TIMESTAMP + INTERVAL 30 DAY,f.payment,f.state
FROM companies c JOIN b2b_packages p ON p.code='AWARENESS_100K'
JOIN ad_slots s ON s.position_code='HOME_HERO'
JOIN (SELECT 'TEST-PLUSE-CT-ACTIVE' code,'ACTIVE' state,'PAID' payment
      UNION ALL SELECT 'TEST-PLUSE-CT-DRAFT','DRAFT','UNPAID'
      UNION ALL SELECT 'TEST-PLUSE-CT-PROPOSED','PROPOSED','UNPAID'
      UNION ALL SELECT 'TEST-PLUSE-CT-PENDING','PENDING_PAYMENT','PENDING'
      UNION ALL SELECT 'TEST-PLUSE-CT-FAILED','PAYMENT_FAILED','FAILED') f
WHERE c.company_code='TEST-PLUSE-APPROVED'
AND NOT EXISTS(SELECT 1 FROM contracts x WHERE x.contract_code=f.code);

INSERT INTO ad_campaigns(contract_id,campaign_name,description,impression_limit,
    scheduled_start_time,scheduled_end_time,submitted_at,approved_at,activated_at,status,created_by)
SELECT c.contract_id,CONCAT('[TEST] The Pluse - ',f.state),'TEST FIXTURE: not real delivery, payment or performance',100000,
    IF(f.state='SCHEDULED',CURRENT_TIMESTAMP + INTERVAL 1 DAY,c.start_at),c.end_at,IF(f.state='DRAFT',NULL,CURRENT_TIMESTAMP),
    IF(f.state IN ('ACTIVE','PAUSED','SCHEDULED'),CURRENT_TIMESTAMP,NULL),
    IF(f.state IN ('ACTIVE','PAUSED'),CURRENT_TIMESTAMP,NULL),f.state,u.user_id
FROM contracts c JOIN users u ON u.username='business.demo' AND u.company_id=c.company_id
JOIN (SELECT 'DRAFT' state UNION ALL SELECT 'PENDING_REVIEW' UNION ALL SELECT 'NEEDS_REVISION'
      UNION ALL SELECT 'ACTIVE' UNION ALL SELECT 'PAUSED' UNION ALL SELECT 'SCHEDULED') f
WHERE c.contract_code='TEST-PLUSE-CT-ACTIVE'
AND NOT EXISTS(SELECT 1 FROM ad_campaigns x WHERE x.contract_id=c.contract_id AND x.campaign_name=CONCAT('[TEST] The Pluse - ',f.state));

-- Packaged SVG survives redeploy; uploaded files on the Free filesystem do not.
INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,target_url,
    mime_type,file_size,width_px,height_px,submitted_at,approved_at,status)
SELECT a.campaign_id,1,'IMAGE','[TEST] The Pluse sample banner','/ads/novalearn.svg','/advertising-demo',
    'image/svg+xml',2048,s.width_px,s.height_px,
    IF(a.status='DRAFT',NULL,CURRENT_TIMESTAMP),
    IF(a.status IN ('ACTIVE','PAUSED','SCHEDULED'),CURRENT_TIMESTAMP,NULL),
    CASE WHEN a.status IN ('ACTIVE','PAUSED','SCHEDULED') THEN 'APPROVED' ELSE a.status END
FROM ad_campaigns a JOIN contracts c ON c.contract_id=a.contract_id JOIN ad_slots s ON s.slot_id=c.slot_id
WHERE c.contract_code='TEST-PLUSE-CT-ACTIVE' AND a.description='TEST FIXTURE: not real delivery, payment or performance'
AND NOT EXISTS(SELECT 1 FROM ad_creatives x WHERE x.campaign_id=a.campaign_id);

INSERT INTO ad_metrics(creative_id,metric_date,impressions_count,clicks_count)
SELECT cr.creative_id,CURRENT_DATE - INTERVAL d.n DAY,1500 + d.n*193,30 + d.n*7
FROM ad_creatives cr JOIN ad_campaigns a ON a.campaign_id=cr.campaign_id
JOIN contracts c ON c.contract_id=a.contract_id
JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7) d
WHERE c.contract_code='TEST-PLUSE-CT-ACTIVE' AND a.status IN ('ACTIVE','PAUSED')
AND NOT EXISTS(SELECT 1 FROM ad_metrics x WHERE x.creative_id=cr.creative_id AND x.metric_date=CURRENT_DATE - INTERVAL d.n DAY);
