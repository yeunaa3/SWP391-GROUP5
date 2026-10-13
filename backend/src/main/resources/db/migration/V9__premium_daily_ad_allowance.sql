-- New migration: do not modify previously deployed V1-V8 scripts.
CREATE TABLE premium_daily_ad_usage (
    user_id BIGINT NOT NULL,
    usage_date DATE NOT NULL,
    used_seconds INT NOT NULL DEFAULT 0,
    lease_until DATETIME(6) NULL,
    PRIMARY KEY (user_id, usage_date),
    CONSTRAINT fk_premium_ad_usage_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

UPDATE subscription_packages SET benefits = JSON_ARRAY(
    'Đọc tập trung · Chỉ Premium',
    'Đọc thành tiếng · Cần giọng tiếng Việt',
    '5 phút miễn quảng cáo mỗi ngày',
    'Đọc nội dung Premium của The Pluse'
);
