
START TRANSACTION;

INSERT INTO b2b_packages
    (code, name, description, price, currency, duration_days, impressions_quota, status)
VALUES
    ('QUICK_1D', 'Quick Boost',
     'A quick campaign for immediate visibility.',
     1000000, 'VND', 1, 5000, 'ACTIVE'),
    ('STARTER_2D', 'Starter Reach',
     'A starter campaign for broad reach.',
     1800000, 'VND', 2, 10000, 'ACTIVE'),
    ('BASIC_3D', 'Basic Campaign',
     'A basic campaign for growing audience reach.',
     2500000, 'VND', 3, 15000, 'ACTIVE'),
    ('STANDARD_5D', 'Standard Reach',
     'A standard campaign for consistent visibility.',
     4000000, 'VND', 5, 30000, 'ACTIVE'),
    ('VALUE_7D', 'Weekly Boost',
     'A weekly campaign for sustained audience engagement.',
     5000000, 'VND', 7, 45000, 'ACTIVE'),
    ('PLUS_10D', 'Plus Campaign',
     'An extended campaign for stronger audience reach.',
     7000000, 'VND', 10, 70000, 'ACTIVE'),
    ('FLEX_20D', 'Extended Reach',
     'A long-term campaign for lasting brand visibility.',
     12000000, 'VND', 20, 150000, 'ACTIVE')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    price = VALUES(price),
    currency = VALUES(currency),
    duration_days = VALUES(duration_days),
    impressions_quota = VALUES(impressions_quota),
    status = VALUES(status);

UPDATE b2b_packages
SET name = 'Brand Awareness',
    description = 'A starter campaign for broad reach.',
    price = 15000000,
    currency = 'VND',
    duration_days = 30,
    impressions_quota = 100000,
    status = 'ACTIVE'
WHERE code = 'AWARENESS_100K';

UPDATE b2b_packages
SET name = 'Growth Campaign',
    description = 'A growth campaign for expanding audience reach.',
    price = 20000000,
    currency = 'VND',
    duration_days = 60,
    impressions_quota = 200000,
    status = 'ACTIVE'
WHERE code = 'GROWTH_500K';

UPDATE b2b_packages
SET name = 'Premium Reach',
    description = 'A premium campaign for maximum audience exposure.',
    price = 25000000,
    currency = 'VND',
    duration_days = 90,
    impressions_quota = 500000,
    status = 'ACTIVE'
WHERE code = 'PREMIUM_1M';

COMMIT;
