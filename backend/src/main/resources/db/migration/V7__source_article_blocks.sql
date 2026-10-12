ALTER TABLE articles
    ADD COLUMN content_blocks JSON NULL,
    ADD COLUMN content_mode VARCHAR(24) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN source_author VARCHAR(500) NULL,
    ADD COLUMN source_checked_at DATETIME(6) NULL;

UPDATE articles SET content_mode='RSS' WHERE source_url IS NOT NULL;
