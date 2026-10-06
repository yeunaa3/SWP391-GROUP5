INSERT INTO categories (name, slug, status) VALUES
    ('Business', 'business', 'ACTIVE'),
    ('Technology', 'technology', 'ACTIVE'),
    ('Society', 'society', 'ACTIVE'),
    ('Agriculture', 'agriculture', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO tags (name, slug, status) VALUES
    ('Market', 'market', 'ACTIVE'),
    ('Artificial Intelligence', 'ai', 'ACTIVE'),
    ('Policy', 'policy', 'ACTIVE'),
    ('Sustainability', 'sustainability', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO articles (title, slug, summary, content, thumbnail_url, is_premium, preview_percentage, views_count, status, published_at) VALUES
    ('Vietnam digital economy enters a new growth cycle', 'vietnam-digital-economy-growth-cycle',
     'Businesses are accelerating cloud, payment and data investments as domestic demand expands.',
     'Vietnamese enterprises are entering a new phase of digital investment. The change is visible in retail, payments, logistics and public services. Leaders are focusing less on isolated experiments and more on measurable operating outcomes.\n\nThe next phase will depend on trusted data, skilled teams and sustainable investment. Companies that connect customer experience with reliable internal systems are likely to move faster than competitors.',
     'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80', FALSE, 20, 18420, 'PUBLISHED', CURRENT_TIMESTAMP(6)),
    ('Inside the race to build responsible AI products', 'responsible-ai-products',
     'A practical look at how product teams balance model capability, safety and user trust.',
     'Artificial intelligence products are moving from prototypes into everyday workflows. That transition changes the work: teams must evaluate quality, safety, latency and cost at the same time.\n\nSuccessful programs define measurable use cases before choosing a model. They also keep humans in the loop for sensitive decisions and monitor outcomes after launch.\n\nPremium analysis: the strongest teams treat evaluation as a product capability, not a final checklist. They create repeatable datasets, incident processes and feedback loops that improve with each release.',
     'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', TRUE, 35, 12680, 'PUBLISHED', CURRENT_TIMESTAMP(6) - INTERVAL 1 DAY),
    ('New logistics corridors reshape regional trade', 'logistics-corridors-regional-trade',
     'Infrastructure investment is shortening delivery times and opening new routes for manufacturers.',
     'New transport corridors are changing how goods move across the region. Manufacturers are reassessing warehouse locations, inventory policies and supplier relationships.\n\nThe largest gains will come from coordinated planning across ports, roads and digital customs systems.',
     'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', FALSE, 20, 9340, 'PUBLISHED', CURRENT_TIMESTAMP(6) - INTERVAL 2 DAY),
    ('Data-driven agriculture moves beyond the pilot stage', 'data-driven-agriculture',
     'Farm cooperatives are using sensors and forecasts to reduce waste and improve crop planning.',
     'Digital agriculture is becoming more practical as sensors, satellite data and weather forecasts become easier to use. Cooperatives are applying these tools to irrigation, fertilizer planning and disease detection.\n\nPremium analysis: adoption still depends on simple interfaces, local support and business models that work for small farms. The technology matters, but distribution and trust matter just as much.',
     'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80', TRUE, 30, 7850, 'PUBLISHED', CURRENT_TIMESTAMP(6) - INTERVAL 3 DAY)
ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), content = VALUES(content),
    thumbnail_url = VALUES(thumbnail_url), is_premium = VALUES(is_premium), status = VALUES(status);

INSERT IGNORE INTO article_categories (article_id, category_id)
SELECT a.article_id, c.category_id FROM articles a JOIN categories c
WHERE (a.slug = 'vietnam-digital-economy-growth-cycle' AND c.slug = 'business')
   OR (a.slug = 'responsible-ai-products' AND c.slug = 'technology')
   OR (a.slug = 'logistics-corridors-regional-trade' AND c.slug = 'business')
   OR (a.slug = 'data-driven-agriculture' AND c.slug = 'agriculture');

INSERT IGNORE INTO article_tags (article_id, tag_id)
SELECT a.article_id, t.tag_id FROM articles a JOIN tags t
WHERE (a.slug = 'vietnam-digital-economy-growth-cycle' AND t.slug = 'market')
   OR (a.slug = 'responsible-ai-products' AND t.slug = 'ai')
   OR (a.slug = 'logistics-corridors-regional-trade' AND t.slug = 'market')
   OR (a.slug = 'data-driven-agriculture' AND t.slug = 'sustainability');

INSERT INTO subscription_packages (code, name, description, benefits, price, currency, duration_days, display_order, status) VALUES
    ('PREMIUM_MONTHLY', 'Monthly Premium', 'Flexible access for regular readers.', JSON_ARRAY('All Premium articles', 'Ad-light reading', 'Bookmark library'), 79000, 'VND', 30, 1, 'ACTIVE'),
    ('PREMIUM_YEARLY', 'Annual Premium', 'Best value for committed readers.', JSON_ARRAY('All Premium articles', 'Ad-light reading', 'Bookmark library', 'Priority support'), 790000, 'VND', 365, 2, 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), benefits = VALUES(benefits),
    price = VALUES(price), duration_days = VALUES(duration_days), status = VALUES(status);

INSERT INTO ad_slots (slot_name, position_code, page_scope, width_px, height_px, base_price, currency, status) VALUES
    ('Homepage Hero', 'HOME_HERO', 'HOME', 1200, 300, 12000000, 'VND', 'ACTIVE'),
    ('Article Leaderboard', 'ARTICLE_TOP', 'ARTICLE', 970, 250, 8000000, 'VND', 'ACTIVE'),
    ('Article Sidebar', 'ARTICLE_SIDEBAR', 'ARTICLE', 300, 600, 5000000, 'VND', 'ACTIVE')
ON DUPLICATE KEY UPDATE slot_name = VALUES(slot_name), page_scope = VALUES(page_scope), width_px = VALUES(width_px),
    height_px = VALUES(height_px), base_price = VALUES(base_price), status = VALUES(status);

INSERT INTO b2b_packages (code, name, price, currency, duration_days, impressions_quota, description, status) VALUES
    ('AWARENESS_100K', 'Brand Awareness', 15000000, 'VND', 30, 100000, 'A starter campaign for broad reach.', 'ACTIVE'),
    ('GROWTH_500K', 'Growth Campaign', 55000000, 'VND', 60, 500000, 'Extended delivery with detailed reporting.', 'ACTIVE'),
    ('PREMIUM_1M', 'Premium Reach', 95000000, 'VND', 90, 1000000, 'High-volume delivery across premium placements.', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), duration_days = VALUES(duration_days),
    impressions_quota = VALUES(impressions_quota), description = VALUES(description), status = VALUES(status);
