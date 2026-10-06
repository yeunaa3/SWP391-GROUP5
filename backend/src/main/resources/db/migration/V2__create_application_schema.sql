-- MySQL 8.4 physical schema for the Premium News and Advertising system.
-- The SRS conceptual ERD stays compact; this migration also contains the
-- junction and operational tables required by the use cases.

CREATE TABLE roles (
    role_id BIGINT NOT NULL AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (role_id),
    UNIQUE KEY uq_roles_name (role_name),
    CONSTRAINT ck_roles_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE companies (
    company_id BIGINT NOT NULL AUTO_INCREMENT,
    company_code VARCHAR(50) NULL,
    company_name VARCHAR(150) NOT NULL,
    tax_code VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address VARCHAR(500) NOT NULL,
    billing_address VARCHAR(500) NULL,
    application_code VARCHAR(50) NOT NULL,
    application_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    submitted_at DATETIME(6) NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME(6) NULL,
    review_note TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (company_id),
    UNIQUE KEY uq_companies_code (company_code),
    UNIQUE KEY uq_companies_tax_code (tax_code),
    UNIQUE KEY uq_companies_application_code (application_code),
    KEY idx_companies_review_queue (application_status, submitted_at),
    CONSTRAINT ck_companies_application_status CHECK (
        application_status IN ('DRAFT', 'PENDING_REVIEW', 'NEEDS_REVISION', 'RESUBMITTED', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT ck_companies_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(254) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NULL,
    phone_number VARCHAR(30) NULL,
    company_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_company (company_id),
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL,
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'))
) ENGINE=InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, role_id),
    KEY idx_user_roles_role (role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE companies
    ADD CONSTRAINT fk_companies_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL;

CREATE TABLE system_settings (
    setting_id BIGINT NOT NULL AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    default_value TEXT NOT NULL,
    data_type VARCHAR(30) NOT NULL DEFAULT 'STRING',
    description VARCHAR(500) NULL,
    validation_rule VARCHAR(500) NULL,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BIGINT NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (setting_id),
    UNIQUE KEY uq_system_settings_key (setting_key),
    CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT ck_system_settings_type CHECK (data_type IN ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON'))
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
    audit_log_id BIGINT NOT NULL AUTO_INCREMENT,
    actor_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    reason VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (audit_log_id),
    KEY idx_audit_entity (entity_type, entity_id, created_at),
    KEY idx_audit_actor (actor_id, created_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
    token_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (token_id),
    UNIQUE KEY uq_password_reset_hash (token_hash),
    KEY idx_password_reset_lookup (token_hash, expires_at, used_at),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    notification_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    related_entity_type VARCHAR(100) NULL,
    related_entity_id VARCHAR(100) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(6) NULL,
    delivery_channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME(6) NULL,
    sent_at DATETIME(6) NULL,
    last_error VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (notification_id),
    KEY idx_notifications_user_unread (user_id, is_read, created_at),
    KEY idx_notifications_delivery (delivery_status, next_attempt_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT ck_notifications_channel CHECK (delivery_channel IN ('IN_APP', 'EMAIL')),
    CONSTRAINT ck_notifications_delivery CHECK (delivery_status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED'))
) ENGINE=InnoDB;

CREATE TABLE categories (
    category_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (category_id),
    UNIQUE KEY uq_categories_slug (slug),
    CONSTRAINT ck_categories_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE tags (
    tag_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (tag_id),
    UNIQUE KEY uq_tags_slug (slug),
    CONSTRAINT ck_tags_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE articles (
    article_id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    thumbnail_url VARCHAR(1000) NULL,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    preview_percentage INT NOT NULL DEFAULT 20,
    views_count BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    published_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (article_id),
    UNIQUE KEY uq_articles_slug (slug),
    KEY idx_articles_feed (status, published_at DESC),
    KEY idx_articles_popular (status, views_count DESC),
    FULLTEXT KEY ftx_articles_search (title, summary, content),
    CONSTRAINT ck_articles_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT ck_articles_preview CHECK (preview_percentage BETWEEN 0 AND 100),
    CONSTRAINT ck_articles_views CHECK (views_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE article_categories (
    article_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (article_id, category_id),
    KEY idx_article_categories_category (category_id, article_id),
    CONSTRAINT fk_article_categories_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_article_categories_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE article_tags (
    article_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    KEY idx_article_tags_tag (tag_id, article_id),
    CONSTRAINT fk_article_tags_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_article_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookmarks (
    bookmark_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    article_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (bookmark_id),
    UNIQUE KEY uq_bookmarks_user_article (user_id, article_id),
    KEY idx_bookmarks_user_date (user_id, created_at DESC),
    CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_bookmarks_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE subscription_packages (
    package_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    benefits JSON NULL,
    price DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    duration_days INT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (package_id),
    UNIQUE KEY uq_subscription_packages_code (code),
    KEY idx_subscription_packages_offer (status, display_order),
    CONSTRAINT ck_subscription_packages_price CHECK (price >= 0),
    CONSTRAINT ck_subscription_packages_duration CHECK (duration_days > 0),
    CONSTRAINT ck_subscription_packages_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
    subscription_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    package_id BIGINT NOT NULL,
    package_code_snapshot VARCHAR(50) NOT NULL,
    package_name_snapshot VARCHAR(100) NOT NULL,
    price_snapshot DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    duration_days_snapshot INT NOT NULL,
    start_at DATETIME(6) NOT NULL,
    end_at DATETIME(6) NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    renewed_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (subscription_id),
    KEY idx_subscriptions_entitlement (user_id, status, start_at, end_at),
    KEY idx_subscriptions_expiry (status, end_at),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_subscriptions_package FOREIGN KEY (package_id) REFERENCES subscription_packages(package_id) ON DELETE RESTRICT,
    CONSTRAINT ck_subscriptions_status CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT ck_subscriptions_dates CHECK (end_at > start_at)
) ENGINE=InnoDB;

CREATE TABLE ad_slots (
    slot_id BIGINT NOT NULL AUTO_INCREMENT,
    slot_name VARCHAR(100) NOT NULL,
    position_code VARCHAR(50) NOT NULL,
    page_scope VARCHAR(50) NOT NULL DEFAULT 'ALL',
    width_px INT NOT NULL,
    height_px INT NOT NULL,
    base_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (slot_id),
    UNIQUE KEY uq_ad_slots_position (position_code),
    KEY idx_ad_slots_offer (status, page_scope),
    CONSTRAINT ck_ad_slots_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_ad_slots_dimensions CHECK (width_px > 0 AND height_px > 0),
    CONSTRAINT ck_ad_slots_price CHECK (base_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE b2b_packages (
    b2b_package_id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    duration_days INT NOT NULL,
    impressions_quota BIGINT NOT NULL,
    description TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (b2b_package_id),
    UNIQUE KEY uq_b2b_packages_code (code),
    KEY idx_b2b_packages_offer (status, price),
    CONSTRAINT ck_b2b_packages_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_b2b_packages_price CHECK (price >= 0),
    CONSTRAINT ck_b2b_packages_duration CHECK (duration_days > 0),
    CONSTRAINT ck_b2b_packages_quota CHECK (impressions_quota > 0)
) ENGINE=InnoDB;

CREATE TABLE contracts (
    contract_id BIGINT NOT NULL AUTO_INCREMENT,
    contract_code VARCHAR(50) NOT NULL,
    contract_name VARCHAR(200) NOT NULL,
    company_id BIGINT NOT NULL,
    b2b_package_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    package_code_snapshot VARCHAR(50) NOT NULL,
    package_name_snapshot VARCHAR(100) NOT NULL,
    package_price_snapshot DECIMAL(18,2) NOT NULL,
    duration_days_snapshot INT NOT NULL,
    impressions_quota_snapshot BIGINT NOT NULL,
    slot_name_snapshot VARCHAR(100) NOT NULL,
    slot_position_snapshot VARCHAR(50) NOT NULL,
    total_value DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    start_at DATETIME(6) NOT NULL,
    end_at DATETIME(6) NOT NULL,
    reservation_expires_at DATETIME(6) NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    revision_no INT NOT NULL DEFAULT 1,
    proposal_document_url VARCHAR(1000) NULL,
    signed_contract_url VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    proposed_at DATETIME(6) NULL,
    accepted_at DATETIME(6) NULL,
    signed_at DATETIME(6) NULL,
    payment_due_at DATETIME(6) NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (contract_id),
    UNIQUE KEY uq_contracts_code (contract_code),
    KEY idx_contracts_company_status (company_id, status, created_at),
    KEY idx_contracts_slot_overlap (slot_id, start_at, end_at, status),
    KEY idx_contracts_expiring_hold (status, reservation_expires_at),
    CONSTRAINT fk_contracts_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE RESTRICT,
    CONSTRAINT fk_contracts_package FOREIGN KEY (b2b_package_id) REFERENCES b2b_packages(b2b_package_id) ON DELETE RESTRICT,
    CONSTRAINT fk_contracts_slot FOREIGN KEY (slot_id) REFERENCES ad_slots(slot_id) ON DELETE RESTRICT,
    CONSTRAINT ck_contracts_dates CHECK (end_at > start_at),
    CONSTRAINT ck_contracts_value CHECK (total_value >= 0),
    CONSTRAINT ck_contracts_payment_status CHECK (payment_status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED')),
    CONSTRAINT ck_contracts_status CHECK (
        status IN ('DRAFT', 'PROPOSED', 'REVISION_REQUESTED', 'ACCEPTED', 'PENDING_PAYMENT', 'ACTIVE', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED', 'COMPLETED')
    )
) ENGINE=InnoDB;

CREATE TABLE ad_campaigns (
    campaign_id BIGINT NOT NULL AUTO_INCREMENT,
    contract_id BIGINT NOT NULL,
    campaign_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    impression_limit BIGINT NULL,
    click_limit BIGINT NULL,
    scheduled_start_time DATETIME(6) NOT NULL,
    scheduled_end_time DATETIME(6) NOT NULL,
    activated_at DATETIME(6) NULL,
    ended_at DATETIME(6) NULL,
    submitted_at DATETIME(6) NULL,
    approved_at DATETIME(6) NULL,
    pause_requested_at DATETIME(6) NULL,
    pause_requested_by BIGINT NULL,
    paused_at DATETIME(6) NULL,
    paused_by BIGINT NULL,
    pause_reason VARCHAR(500) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (campaign_id),
    KEY idx_campaigns_contract (contract_id, status),
    KEY idx_campaigns_schedule (status, scheduled_start_time, scheduled_end_time),
    CONSTRAINT fk_campaigns_contract FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE RESTRICT,
    CONSTRAINT fk_campaigns_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_campaigns_pause_requester FOREIGN KEY (pause_requested_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_campaigns_pauser FOREIGN KEY (paused_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT ck_campaigns_dates CHECK (scheduled_end_time > scheduled_start_time),
    CONSTRAINT ck_campaigns_limits CHECK ((impression_limit IS NULL OR impression_limit > 0) AND (click_limit IS NULL OR click_limit > 0)),
    CONSTRAINT ck_campaigns_status CHECK (
        status IN ('DRAFT', 'PENDING_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED')
    )
) ENGINE=InnoDB;

CREATE TABLE ad_targeting (
    target_id BIGINT NOT NULL AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    target_audience VARCHAR(500) NULL,
    geo_scope VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (target_id),
    UNIQUE KEY uq_ad_targeting_campaign (campaign_id),
    CONSTRAINT fk_ad_targeting_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ad_targeting_categories (
    target_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    PRIMARY KEY (target_id, category_id),
    KEY idx_target_categories_category (category_id),
    CONSTRAINT fk_target_categories_target FOREIGN KEY (target_id) REFERENCES ad_targeting(target_id) ON DELETE CASCADE,
    CONSTRAINT fk_target_categories_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ad_targeting_tags (
    target_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (target_id, tag_id),
    KEY idx_target_tags_tag (tag_id),
    CONSTRAINT fk_target_tags_target FOREIGN KEY (target_id) REFERENCES ad_targeting(target_id) ON DELETE CASCADE,
    CONSTRAINT fk_target_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ad_creatives (
    creative_id BIGINT NOT NULL AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    creative_type VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    media_url VARCHAR(1000) NOT NULL,
    media_object_key VARCHAR(500) NULL,
    target_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    width_px INT NOT NULL,
    height_px INT NOT NULL,
    checksum_sha256 CHAR(64) NULL,
    submitted_at DATETIME(6) NULL,
    approved_at DATETIME(6) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (creative_id),
    UNIQUE KEY uq_ad_creatives_version (campaign_id, version_no),
    UNIQUE KEY uq_ad_creatives_pair (creative_id, campaign_id),
    KEY idx_ad_creatives_delivery (campaign_id, status, version_no),
    CONSTRAINT fk_ad_creatives_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE CASCADE,
    CONSTRAINT ck_ad_creatives_type CHECK (creative_type IN ('IMAGE', 'VIDEO')),
    CONSTRAINT ck_ad_creatives_dimensions CHECK (file_size > 0 AND width_px > 0 AND height_px > 0),
    CONSTRAINT ck_ad_creatives_status CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'REJECTED', 'ARCHIVED'))
) ENGINE=InnoDB;

CREATE TABLE ad_reviews (
    review_id BIGINT NOT NULL AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    creative_id BIGINT NULL,
    reviewer_id BIGINT NOT NULL,
    review_type VARCHAR(20) NOT NULL,
    decision VARCHAR(30) NOT NULL,
    reason TEXT NULL,
    reviewed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (review_id),
    KEY idx_ad_reviews_queue (campaign_id, review_type, reviewed_at),
    KEY idx_ad_reviews_reviewer (reviewer_id, reviewed_at),
    CONSTRAINT fk_ad_reviews_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE CASCADE,
    CONSTRAINT fk_ad_reviews_creative_campaign FOREIGN KEY (creative_id, campaign_id) REFERENCES ad_creatives(creative_id, campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ad_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT ck_ad_reviews_type CHECK (review_type IN ('CAMPAIGN', 'CREATIVE')),
    CONSTRAINT ck_ad_reviews_decision CHECK (decision IN ('APPROVED', 'NEEDS_REVISION', 'REJECTED')),
    CONSTRAINT ck_ad_reviews_target CHECK ((review_type = 'CAMPAIGN' AND creative_id IS NULL) OR (review_type = 'CREATIVE' AND creative_id IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE ad_metrics (
    metric_id BIGINT NOT NULL AUTO_INCREMENT,
    creative_id BIGINT NOT NULL,
    metric_date DATE NOT NULL,
    impressions_count BIGINT NOT NULL DEFAULT 0,
    clicks_count BIGINT NOT NULL DEFAULT 0,
    invalid_clicks_count BIGINT NOT NULL DEFAULT 0,
    delivery_errors_count BIGINT NOT NULL DEFAULT 0,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (metric_id),
    UNIQUE KEY uq_ad_metrics_creative_date (creative_id, metric_date),
    KEY idx_ad_metrics_date (metric_date),
    CONSTRAINT fk_ad_metrics_creative FOREIGN KEY (creative_id) REFERENCES ad_creatives(creative_id) ON DELETE RESTRICT,
    CONSTRAINT ck_ad_metrics_nonnegative CHECK (
        impressions_count >= 0 AND clicks_count >= 0 AND invalid_clicks_count >= 0 AND delivery_errors_count >= 0
    )
) ENGINE=InnoDB;

CREATE TABLE transactions (
    transaction_id BIGINT NOT NULL AUTO_INCREMENT,
    txn_ref VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    user_id BIGINT NOT NULL,
    subscription_id BIGINT NULL,
    contract_id BIGINT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    payment_gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(150) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME(6) NULL,
    failure_reason VARCHAR(500) NULL,
    invoice_number VARCHAR(100) NULL,
    invoice_issued_at DATETIME(6) NULL,
    invoice_url VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (transaction_id),
    UNIQUE KEY uq_transactions_ref (txn_ref),
    UNIQUE KEY uq_transactions_gateway_id (gateway_transaction_id),
    KEY idx_transactions_user (user_id, status, created_at),
    KEY idx_transactions_subscription (subscription_id),
    KEY idx_transactions_contract (contract_id),
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_contract FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE RESTRICT,
    CONSTRAINT ck_transactions_type CHECK (transaction_type IN ('PREMIUM_PURCHASE', 'PREMIUM_RENEWAL', 'ADVERTISING_PAYMENT', 'REFUND')),
    CONSTRAINT ck_transactions_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
    CONSTRAINT ck_transactions_amount CHECK (amount >= 0),
    CONSTRAINT ck_transactions_subject CHECK ((subscription_id IS NOT NULL) <> (contract_id IS NOT NULL))
) ENGINE=InnoDB;

-- Physical support table: one partnership application may contain multiple legal documents.
CREATE TABLE company_documents (
    document_id BIGINT NOT NULL AUTO_INCREMENT,
    company_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    storage_object_key VARCHAR(500) NOT NULL,
    media_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    checksum_sha256 CHAR(64) NULL,
    version_no INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    uploaded_by BIGINT NOT NULL,
    uploaded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (document_id),
    UNIQUE KEY uq_company_documents_version (company_id, document_type, version_no),
    KEY idx_company_documents_active (company_id, status),
    CONSTRAINT fk_company_documents_company FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    CONSTRAINT fk_company_documents_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT ck_company_documents_size CHECK (file_size > 0),
    CONSTRAINT ck_company_documents_status CHECK (status IN ('ACTIVE', 'REPLACED', 'REJECTED'))
) ENGINE=InnoDB;

-- Physical support table: guarantees idempotent handling of gateway callbacks.
CREATE TABLE payment_webhook_events (
    webhook_event_id BIGINT NOT NULL AUTO_INCREMENT,
    payment_gateway VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(150) NOT NULL,
    txn_ref VARCHAR(100) NOT NULL,
    signature_valid BOOLEAN NOT NULL,
    payload JSON NOT NULL,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    processed_at DATETIME(6) NULL,
    error_message VARCHAR(1000) NULL,
    received_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (webhook_event_id),
    UNIQUE KEY uq_payment_webhook_provider_event (payment_gateway, provider_event_id),
    KEY idx_payment_webhook_txn (txn_ref, processing_status),
    CONSTRAINT fk_payment_webhook_txn FOREIGN KEY (txn_ref) REFERENCES transactions(txn_ref) ON DELETE RESTRICT,
    CONSTRAINT ck_payment_webhook_status CHECK (processing_status IN ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED'))
) ENGINE=InnoDB;

-- Physical support table: raw events are validated/deduplicated before daily aggregation.
CREATE TABLE ad_events (
    event_id BIGINT NOT NULL AUTO_INCREMENT,
    event_type VARCHAR(20) NOT NULL,
    campaign_id BIGINT NOT NULL,
    creative_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    article_id BIGINT NULL,
    user_id BIGINT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    ip_hash CHAR(64) NULL,
    user_agent_hash CHAR(64) NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    invalid_reason VARCHAR(100) NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (event_id),
    KEY idx_ad_events_aggregate (creative_id, event_type, is_valid, occurred_at),
    KEY idx_ad_events_dedup (request_fingerprint, event_type, occurred_at),
    CONSTRAINT fk_ad_events_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ad_events_creative FOREIGN KEY (creative_id) REFERENCES ad_creatives(creative_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ad_events_slot FOREIGN KEY (slot_id) REFERENCES ad_slots(slot_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ad_events_article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE SET NULL,
    CONSTRAINT fk_ad_events_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT ck_ad_events_type CHECK (event_type IN ('IMPRESSION', 'CLICK', 'DELIVERY_ERROR'))
) ENGINE=InnoDB;
