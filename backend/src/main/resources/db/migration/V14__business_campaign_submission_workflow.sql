-- Chỉ bổ sung schema mới; giữ nguyên V1–V13 đã dùng trên DB chung.
ALTER TABLE companies ADD COLUMN industry VARCHAR(150) NULL,
    ADD COLUMN contact_person VARCHAR(150) NULL;
ALTER TABLE company_application_versions ADD COLUMN industry VARCHAR(150) NULL,
    ADD COLUMN contact_person VARCHAR(150) NULL;

ALTER TABLE ad_campaigns ADD COLUMN campaign_code VARCHAR(50) NULL,
    ADD COLUMN target_url VARCHAR(1000) NULL,
    ADD COLUMN edit_version INT NOT NULL DEFAULT 1,
    ADD COLUMN client_request_key VARCHAR(80) NULL,
    ADD COLUMN replaces_campaign_id BIGINT NULL,
    ADD CONSTRAINT fk_campaign_replacement FOREIGN KEY (replaces_campaign_id)
        REFERENCES ad_campaigns(campaign_id) ON DELETE RESTRICT,
    ADD UNIQUE KEY uq_campaign_request (created_by, client_request_key);
UPDATE ad_campaigns SET campaign_code=CONCAT('CMP-',LPAD(campaign_id,8,'0'));
UPDATE ad_campaigns c SET target_url=(SELECT cr.target_url FROM ad_creatives cr
    WHERE cr.campaign_id=c.campaign_id ORDER BY cr.version_no DESC LIMIT 1);
-- Cho phép fixture/adapter cũ insert; API dùng COALESCE CMP-id khi code chưa được cấp.
ALTER TABLE ad_campaigns ADD UNIQUE KEY uq_campaign_code (campaign_code);
ALTER TABLE ad_targeting ADD COLUMN device_type VARCHAR(20) NOT NULL DEFAULT 'ALL';

-- Snapshot JSON là dữ liệu tại thời điểm nộp, không UPDATE khi sửa bản nháp.
CREATE TABLE campaign_submissions (
    submission_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    creative_id BIGINT NOT NULL,
    snapshot JSON NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    submitted_by BIGINT NOT NULL,
    submitted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    review_note VARCHAR(2000) NULL,
    UNIQUE KEY uq_campaign_submission (campaign_id,version_no),
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE RESTRICT,
    FOREIGN KEY (creative_id,campaign_id) REFERENCES ad_creatives(creative_id,campaign_id) ON DELETE RESTRICT,
    FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CHECK (status IN ('PENDING_REVIEW','APPROVED','NEEDS_REVISION','REJECTED'))
) ENGINE=InnoDB;

CREATE TABLE campaign_activity (
    activity_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    actor_id BIGINT NULL,
    action VARCHAR(60) NOT NULL,
    note VARCHAR(2000) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE RESTRICT,
    FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE contracts ADD COLUMN quote_snapshot JSON NULL;
