ALTER TABLE contract_proposals
    DROP CHECK ck_contract_proposals_status;

ALTER TABLE contract_proposals
    ADD CONSTRAINT ck_contract_proposals_status
    CHECK (status IN (
        'DRAFT',
        'SENT',
        'REVISION_REQUESTED',
        'ACCEPTED',
        'SUPERSEDED',
        'EXPIRED'
    ));

ALTER TABLE contract_proposals
    ADD COLUMN business_response_reason TEXT NULL AFTER sent_at;