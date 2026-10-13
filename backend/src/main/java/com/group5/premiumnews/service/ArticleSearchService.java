package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.common.PageResponse;
import com.group5.premiumnews.dto.content.ArticleSummaryResponse;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ArticleSearchService {

    private final JdbcTemplate jdbc;

    public ArticleSearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Category(String slug, String name) {}

    public List<Category> categories() {
        return jdbc.query(
            "SELECT slug,name FROM categories WHERE status='ACTIVE' ORDER BY name",
            (rs, n) -> new Category(rs.getString(1), rs.getString(2))
        );
    }

    public PageResponse<ArticleSummaryResponse> search(
        String query,
        String category,
        String access,
        LocalDate from,
        LocalDate to,
        String sort,
        int page,
        int size
    ) {
        if (
            query.length() > 200 ||
            category.length() > 100 ||
            page < 0 ||
            page > 1000000 ||
            size < 1 ||
            size > 50 ||
            !List.of("all", "public", "premium").contains(access) ||
            !List.of("newest", "oldest", "popular").contains(sort) ||
            (from != null &&
                (from.getYear() < 1000 || from.getYear() > 9999)) ||
            (to != null &&
                (to.getYear() < 1000 ||
                    to.isAfter(LocalDate.of(9999, 12, 30)))) ||
            (from != null && to != null && from.isAfter(to))
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid article search filters"
        );
        StringBuilder conditions = new StringBuilder(
            " WHERE a.status='PUBLISHED'"
        );
        List<Object> parameters = new ArrayList<>();
        if (!query.isBlank()) {
            String pattern =
                "%" +
                query
                    .trim()
                    .replace("!", "!!")
                    .replace("%", "!%")
                    .replace("_", "!_") +
                "%";
            conditions.append(
                " AND (a.title LIKE ? ESCAPE '!' OR a.summary LIKE ? ESCAPE '!')"
            );
            parameters.add(pattern);
            parameters.add(pattern);
        }
        if (!category.isBlank()) {
            conditions.append(
                " AND EXISTS (SELECT 1 FROM article_categories ac JOIN categories c ON c.category_id=ac.category_id WHERE ac.article_id=a.article_id AND c.status='ACTIVE' AND c.slug=?)"
            );
            parameters.add(category.trim());
        }
        if (!access.equals("all")) {
            conditions.append(" AND a.is_premium=?");
            parameters.add(access.equals("premium"));
        }
        // Dates are Vietnamese calendar days, matching the public edition's timezone.
        var publicationZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        if (from != null) {
            conditions.append(" AND a.published_at>=?");
            parameters.add(
                Timestamp.from(from.atStartOfDay(publicationZone).toInstant())
            );
        }
        if (to != null) {
            conditions.append(" AND a.published_at<?");
            parameters.add(
                Timestamp.from(
                    to.plusDays(1).atStartOfDay(publicationZone).toInstant()
                )
            );
        }
        Long matchingCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM articles a" + conditions,
            Long.class,
            parameters.toArray()
        );
        long totalElements = matchingCount == null ? 0 : matchingCount;
        String sortOrder = switch (sort) {
            case "oldest" -> "a.published_at ASC,a.article_id ASC";
            case "popular" -> "a.views_count DESC,a.published_at DESC,a.article_id DESC";
            default -> "a.published_at DESC,a.article_id DESC";
        };
        parameters.add(size);
        parameters.add((long) page * size);
        var articles = jdbc.query(
            """
            SELECT a.article_id,a.title,a.slug,a.summary,a.thumbnail_url,a.is_premium,a.views_count,
                a.published_at,a.source_name,a.source_url,
                COALESCE((SELECT MIN(c.name) FROM article_categories ac JOIN categories c
                    ON c.category_id=ac.category_id WHERE ac.article_id=a.article_id AND c.status='ACTIVE'),'General') category_name
            FROM articles a
            """ +
                conditions +
                " ORDER BY " +
                sortOrder +
                " LIMIT ? OFFSET ?",
            (rs, n) ->
                new ArticleSummaryResponse(
                    rs.getLong("article_id"),
                    rs.getString("title"),
                    rs.getString("slug"),
                    rs.getString("summary"),
                    rs.getString("thumbnail_url"),
                    rs.getBoolean("is_premium"),
                    rs.getLong("views_count"),
                    rs.getTimestamp("published_at").toInstant(),
                    rs.getString("category_name"),
                    rs.getString("source_name"),
                    rs.getString("source_url")
                ),
            parameters.toArray()
        );
        int totalPages = (int) Math.ceil(totalElements / (double) size);
        return new PageResponse<>(
            articles,
            page,
            size,
            totalElements,
            totalPages,
            page == 0,
            page + 1 >= totalPages
        );
    }
}
