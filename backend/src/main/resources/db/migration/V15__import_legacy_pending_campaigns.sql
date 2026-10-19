-- Bàn giao an toàn các campaign đã gửi trước khi có campaign_submissions.
-- Không tạo approval hoặc suy đoán creative nếu không có bản PENDING_REVIEW xác định được.
UPDATE ad_campaigns c
SET target_url=(SELECT cr.target_url FROM ad_creatives cr WHERE cr.campaign_id=c.campaign_id
    AND cr.status='PENDING_REVIEW' ORDER BY cr.version_no DESC LIMIT 1)
WHERE c.status='PENDING_REVIEW' AND (c.target_url IS NULL OR c.target_url='')
    AND NOT EXISTS(SELECT 1 FROM campaign_submissions s WHERE s.campaign_id=c.campaign_id);

INSERT INTO campaign_submissions(campaign_id,version_no,creative_id,snapshot,status,submitted_by,submitted_at)
SELECT c.campaign_id,1,cr.creative_id,
    JSON_OBJECT(
        'legacyImported',TRUE,
        'campaign',JSON_OBJECT('campaign_id',c.campaign_id,'campaign_code',c.campaign_code,
            'campaign_name',c.campaign_name,'description',c.description,'contract_id',c.contract_id,
            'target_url',c.target_url,'scheduled_start_time',c.scheduled_start_time,
            'scheduled_end_time',c.scheduled_end_time,'status',c.status,'edit_version',c.edit_version),
        'contract',JSON_OBJECT('contract_id',ct.contract_id,'contract_code',ct.contract_code,
            'slot_name_snapshot',ct.slot_name_snapshot,'slot_position_snapshot',ct.slot_position_snapshot,
            'payment_status',ct.payment_status,'status',ct.status,'start_at',ct.start_at,'end_at',ct.end_at,
            'total_value',ct.total_value,'impressions_quota_snapshot',ct.impressions_quota_snapshot),
        'creative',JSON_OBJECT('creative_id',cr.creative_id,'campaign_id',cr.campaign_id,
            'version_no',cr.version_no,'title',cr.title,'creative_type',cr.creative_type,
            'media_url',cr.media_url,'media_object_key',cr.media_object_key,'target_url',cr.target_url,
            'mime_type',cr.mime_type,'width_px',cr.width_px,'height_px',cr.height_px,
            'file_size',cr.file_size,'checksum_sha256',cr.checksum_sha256,'status',cr.status),
        'targeting',JSON_OBJECT('device_type',COALESCE(t.device_type,'ALL'),
            'geo_scope',COALESCE(t.geo_scope,'ALL'),'target_audience',t.target_audience,
            'categoryIds',COALESCE((SELECT JSON_ARRAYAGG(x.category_id) FROM ad_targeting_categories x WHERE x.target_id=t.target_id),JSON_ARRAY()),
            'tagIds',COALESCE((SELECT JSON_ARRAYAGG(x.tag_id) FROM ad_targeting_tags x WHERE x.target_id=t.target_id),JSON_ARRAY()))),
    'PENDING_REVIEW',c.created_by,COALESCE(c.submitted_at,cr.submitted_at,c.created_at)
FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
JOIN ad_creatives cr ON cr.campaign_id=c.campaign_id AND cr.status='PENDING_REVIEW'
    AND cr.version_no=(SELECT MAX(v.version_no) FROM ad_creatives v WHERE v.campaign_id=c.campaign_id AND v.status='PENDING_REVIEW')
LEFT JOIN ad_targeting t ON t.campaign_id=c.campaign_id
WHERE c.status='PENDING_REVIEW'
    AND NOT EXISTS(SELECT 1 FROM campaign_submissions s WHERE s.campaign_id=c.campaign_id);

INSERT INTO campaign_activity(campaign_id,action,note)
SELECT c.campaign_id,'LEGACY_SUBMISSION_RECOVERY',
    'Yêu cầu từ phiên bản cũ chưa có creative chờ duyệt xác định được. Vui lòng hoàn thiện và gửi lại.'
FROM ad_campaigns c WHERE c.status='PENDING_REVIEW'
    AND NOT EXISTS(SELECT 1 FROM campaign_submissions s WHERE s.campaign_id=c.campaign_id);

INSERT INTO notifications(user_id,title,content,notification_type,related_entity_type,related_entity_id,delivery_status,sent_at)
SELECT DISTINCT u.user_id,'Cần bổ sung chiến dịch đã gửi',
    'Yêu cầu từ phiên bản cũ chưa có creative chờ duyệt xác định được. Hồ sơ được mở lại để bổ sung và gửi duyệt, không có approval tự động.',
    'WORKFLOW','CAMPAIGN',CAST(c.campaign_id AS CHAR),'SENT',CURRENT_TIMESTAMP(6)
FROM ad_campaigns c JOIN contracts ct ON ct.contract_id=c.contract_id
JOIN users u ON u.company_id=ct.company_id AND u.status='ACTIVE'
WHERE c.status='PENDING_REVIEW'
    AND NOT EXISTS(SELECT 1 FROM campaign_submissions s WHERE s.campaign_id=c.campaign_id);

UPDATE ad_campaigns c SET status='NEEDS_REVISION',edit_version=edit_version+1
WHERE c.status='PENDING_REVIEW'
    AND NOT EXISTS(SELECT 1 FROM campaign_submissions s WHERE s.campaign_id=c.campaign_id);
