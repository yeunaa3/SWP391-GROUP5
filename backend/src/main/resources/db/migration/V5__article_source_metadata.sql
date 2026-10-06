ALTER TABLE articles
    ADD COLUMN source_name VARCHAR(100) NULL,
    ADD COLUMN source_url VARCHAR(1000) NULL,
    ADD COLUMN imported_at DATETIME(6) NULL;
