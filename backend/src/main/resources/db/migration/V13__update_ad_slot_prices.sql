START TRANSACTION;

-- Update prices for existing advertising slots
UPDATE ad_slots
SET base_price = 7500000,
    currency = 'VND'
WHERE position_code = 'HOME_HERO';

UPDATE ad_slots
SET base_price = 4000000,
    currency = 'VND'
WHERE position_code = 'ARTICLE_TOP';

UPDATE ad_slots
SET base_price = 3000000,
    currency = 'VND'
WHERE position_code = 'ARTICLE_SIDEBAR';

-- Insert additional advertising slots
INSERT INTO ad_slots
    (slot_name, position_code, page_scope, width_px, height_px, base_price, currency, status)
VALUES
    ('Article Inline', 'ARTICLE_INLINE', 'ARTICLE', 728, 90, 3500000, 'VND', 'ACTIVE'),
    ('Article Bottom Banner', 'ARTICLE_BOTTOM', 'ARTICLE', 970, 250, 4500000, 'VND', 'ACTIVE'),
    ('Homepage Sidebar', 'HOME_SIDEBAR', 'HOME', 300, 250, 2500000, 'VND', 'ACTIVE');

COMMIT;
