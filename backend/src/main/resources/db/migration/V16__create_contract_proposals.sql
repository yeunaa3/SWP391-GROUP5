CREATE TABLE contract_proposals (
    proposal_id BIGINT NOT NULL AUTO_INCREMENT,
    contract_id BIGINT NOT NULL,
    revision_no INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    commercial_terms TEXT NOT NULL,
    proposed_amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    proposed_start_at DATETIME(6) NOT NULL,
    proposed_end_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    sent_at DATETIME(6) NULL,
    accepted_at DATETIME(6) NULL,

    PRIMARY KEY (proposal_id),
    UNIQUE KEY uq_contract_proposals_revision (contract_id, revision_no),
    KEY idx_contract_proposals_status (contract_id, status),
    KEY idx_contract_proposals_expiry (status, expires_at),

    CONSTRAINT fk_contract_proposals_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE RESTRICT,
    CONSTRAINT fk_contract_proposals_creator
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,

    CONSTRAINT ck_contract_proposals_revision CHECK (revision_no > 0),
    CONSTRAINT ck_contract_proposals_amount CHECK (proposed_amount >= 0),
    CONSTRAINT ck_contract_proposals_dates CHECK (proposed_end_at > proposed_start_at),
    CONSTRAINT ck_contract_proposals_status
        CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED', 'EXPIRED'))
) ENGINE=InnoDB;