ALTER TABLE companies
    ADD COLUMN application_version INT NOT NULL DEFAULT 0 AFTER application_status;

ALTER TABLE companies
    ADD COLUMN review_priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' AFTER application_version;

ALTER TABLE companies
    ADD CONSTRAINT ck_companies_application_version CHECK (application_version >= 0),
    ADD CONSTRAINT ck_companies_review_priority CHECK (review_priority IN ('NORMAL', 'HIGH', 'URGENT'));

-- Existing submitted records become version 1. Drafts remain version 0 until first submission.
UPDATE companies
SET application_version = 1,
    submitted_at = COALESCE(submitted_at, updated_at)
WHERE application_status <> 'DRAFT';

UPDATE companies
SET review_priority = 'HIGH'
WHERE application_status = 'RESUBMITTED';

CREATE TABLE company_application_versions (
    company_id BIGINT NOT NULL,
    application_version INT NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    tax_code VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(500) NOT NULL,
    billing_address VARCHAR(500) NULL,
    submitted_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id, application_version),
    CONSTRAINT fk_company_application_versions_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT ck_company_application_versions_number CHECK (application_version > 0)
) ENGINE=InnoDB;

CREATE TABLE company_application_version_documents (
    company_id BIGINT NOT NULL,
    application_version INT NOT NULL,
    document_id BIGINT NOT NULL,
    PRIMARY KEY (company_id, application_version, document_id),
    CONSTRAINT fk_application_documents_version
        FOREIGN KEY (company_id, application_version)
        REFERENCES company_application_versions(company_id, application_version) ON DELETE CASCADE,
    CONSTRAINT fk_application_documents_document
        FOREIGN KEY (document_id) REFERENCES company_documents(document_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE partnership_reviews (
    partnership_review_id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    application_version INT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    decision VARCHAR(30) NOT NULL,
    review_note TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (partnership_review_id),
    KEY idx_partnership_reviews_company (company_id, application_version, created_at),
    KEY idx_partnership_reviews_reviewer (reviewer_id, created_at),
    CONSTRAINT fk_partnership_reviews_version
        FOREIGN KEY (company_id, application_version)
        REFERENCES company_application_versions(company_id, application_version) ON DELETE RESTRICT,
    CONSTRAINT fk_partnership_reviews_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT ck_partnership_reviews_decision
        CHECK (decision IN ('NOTE', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'))
) ENGINE=InnoDB;

-- Preserve the current state as the first immutable snapshot for legacy submissions.
INSERT INTO company_application_versions (
    company_id, application_version, company_name, tax_code, email, phone,
    address, billing_address, submitted_at
)
SELECT company_id, application_version, company_name, tax_code, email, phone,
       address, billing_address, submitted_at
FROM companies
WHERE application_version > 0;

INSERT INTO company_application_version_documents (company_id, application_version, document_id)
SELECT c.company_id, c.application_version, d.document_id
FROM companies c
JOIN company_documents d ON d.company_id = c.company_id AND d.status = 'ACTIVE'
WHERE c.application_version > 0;
