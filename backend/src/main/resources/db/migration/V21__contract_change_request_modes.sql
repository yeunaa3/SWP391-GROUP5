ALTER TABLE contract_proposals
    ADD COLUMN business_response_type VARCHAR(30) NULL AFTER business_response_reason,
    ADD COLUMN manager_comment TEXT NULL AFTER commercial_terms,
    ADD COLUMN proposed_package_id BIGINT NULL AFTER contract_id,
    ADD COLUMN proposed_slot_id BIGINT NULL AFTER proposed_package_id,
    ADD COLUMN proposed_package_name_snapshot VARCHAR(100) NULL AFTER proposed_slot_id,
    ADD COLUMN proposed_package_code_snapshot VARCHAR(50) NULL AFTER proposed_package_name_snapshot,
    ADD COLUMN proposed_slot_name_snapshot VARCHAR(100) NULL AFTER proposed_package_code_snapshot,
    ADD COLUMN proposed_slot_position_snapshot VARCHAR(50) NULL AFTER proposed_slot_name_snapshot,
    ADD COLUMN proposed_duration_days_snapshot INT NULL AFTER proposed_slot_position_snapshot,
    ADD COLUMN proposed_impressions_quota_snapshot BIGINT NULL AFTER proposed_duration_days_snapshot,
    ADD COLUMN proposed_package_price_snapshot DECIMAL(18,2) NULL AFTER proposed_impressions_quota_snapshot,
    ADD COLUMN proposed_slot_price_snapshot DECIMAL(18,2) NULL AFTER proposed_package_price_snapshot;

ALTER TABLE contract_proposals
    ADD CONSTRAINT fk_contract_proposals_package
        FOREIGN KEY (proposed_package_id) REFERENCES b2b_packages(b2b_package_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_contract_proposals_slot
        FOREIGN KEY (proposed_slot_id) REFERENCES ad_slots(slot_id) ON DELETE RESTRICT,
    ADD CONSTRAINT ck_contract_proposals_response_type
        CHECK (business_response_type IS NULL OR business_response_type IN ('TERMS', 'CONTRACT_INFO'));
