package com.group5.premiumnews.service;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class BookmarkService {
    private static final int MAX_PAGE = 100_000;
    private static final int MAX_PAGE_SIZE = 50;

    public record Item(
            long id,
            String title,
            String slug,
            boolean premium,
            Instant savedAt,
            String category) {}

    public record Page(List<Item> items, int page, int size, boolean hasNext) {}

    private final JdbcTemplate jdbc;

    public BookmarkService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Page list(long userId, int page, int size) {
        validatePagination(page, size);

        // The extra row tells the client whether another page exists.
        List<Item> rows = jdbc.query("""
                SELECT a.article_id, a.title, a.slug, a.is_premium, b.created_at,
                    (SELECT GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ')
                     FROM article_categories ac
                     JOIN categories c ON c.category_id = ac.category_id
                     WHERE ac.article_id = a.article_id AND c.status = 'ACTIVE') category
                FROM bookmarks b
                JOIN articles a ON a.article_id = b.article_id
                WHERE b.user_id = ?
                  AND a.status = 'PUBLISHED'
                  AND a.published_at <= CURRENT_TIMESTAMP
                ORDER BY b.created_at DESC, b.bookmark_id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, index) -> new Item(
                        rs.getLong("article_id"),
                        rs.getString("title"),
                        rs.getString("slug"),
                        rs.getBoolean("is_premium"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getString("category")),
                userId, size + 1, page * size);

        boolean hasNext = rows.size() > size;
        List<Item> items = List.copyOf(rows.subList(0, Math.min(size, rows.size())));
        return new Page(items, page, size, hasNext);
    }

    public boolean saved(long userId, long articleId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM bookmarks b
                JOIN articles a ON a.article_id = b.article_id
                WHERE b.user_id = ? AND b.article_id = ?
                  AND a.status = 'PUBLISHED'
                  AND a.published_at <= CURRENT_TIMESTAMP
                """, Integer.class, userId, articleId);

        return count != null && count > 0;
    }

    @Transactional
    public void save(long userId, long articleId) {
        // The unique user/article key makes repeated saves idempotent.
        int changed = jdbc.update("""
                INSERT INTO bookmarks (user_id, article_id)
                SELECT ?, article_id
                FROM articles
                WHERE article_id = ? AND status = 'PUBLISHED'
                  AND published_at <= CURRENT_TIMESTAMP
                ON DUPLICATE KEY UPDATE article_id = VALUES(article_id)
                """, userId, articleId);

        if (changed == 0 && !isArticleAvailable(articleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Article unavailable");
        }
    }

    @Transactional
    public void remove(long userId, long articleId) {
        jdbc.update(
                "DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?",
                userId, articleId);
    }

    private boolean isArticleAvailable(long articleId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM articles
                WHERE article_id = ? AND status = 'PUBLISHED'
                  AND published_at <= CURRENT_TIMESTAMP
                """, Integer.class, articleId);

        return count != null && count > 0;
    }

    private static void validatePagination(int page, int size) {
        if (page < 0 || page > MAX_PAGE || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid bookmark page");
        }
    }
}
