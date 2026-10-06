INSERT INTO roles (role_name, description, status) VALUES
    ('READER', 'Registered reader without an active Premium entitlement', 'ACTIVE'),
    ('SUBSCRIBER', 'Reader with Premium subscription access', 'ACTIVE'),
    ('BUSINESS', 'Business representative using the advertising workspace', 'ACTIVE'),
    ('AD_MANAGER', 'Publisher employee managing partnership and advertising operations', 'ACTIVE'),
    ('ADMINISTRATOR', 'System administrator', 'ACTIVE')
ON DUPLICATE KEY UPDATE description = VALUES(description), status = VALUES(status);

INSERT INTO system_settings (
    setting_key, setting_value, default_value, data_type, description, validation_rule, is_editable
) VALUES
    ('booking.hold.minutes', '30', '30', 'INTEGER', 'Minutes before an unpaid slot reservation is released', '1..1440', TRUE),
    ('creative.max.image.bytes', '10485760', '10485760', 'INTEGER', 'Maximum advertising image size in bytes', '1..52428800', TRUE),
    ('creative.max.video.bytes', '104857600', '104857600', 'INTEGER', 'Maximum advertising video size in bytes', '1..524288000', TRUE),
    ('ad.click.dedup.seconds', '30', '30', 'INTEGER', 'Duplicate click suppression window', '1..3600', TRUE),
    ('payment.currency', 'VND', 'VND', 'STRING', 'Default settlement currency', 'ISO-4217', FALSE)
ON DUPLICATE KEY UPDATE
    default_value = VALUES(default_value),
    description = VALUES(description),
    validation_rule = VALUES(validation_rule),
    is_editable = VALUES(is_editable);
