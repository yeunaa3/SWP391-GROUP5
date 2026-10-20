package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.content.AdSlotResponse;
import com.group5.premiumnews.dto.content.AdvertisingOfferResponse;
import com.group5.premiumnews.dto.content.ArticleDetailResponse;
import com.group5.premiumnews.dto.content.ArticleSummaryResponse;
import com.group5.premiumnews.dto.content.SubscriptionPackageResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/**
 * ============================================================================
 * [BF-01][BF-08] PUBLIC CONTENT & ENTITLEMENT SERVICE
 * Phụ trách: Cường (Phân quyền truy cập nội dung, Gói cước Premium & Danh mục quảng cáo)
 * 
 * Các Use Case liên quan:
 * - [BF-01][UC-11] Cung cấp danh mục gói cước The Pulse Premium
 * - [BF-01][Subscription Check] Xác thực tài khoản Subscriber còn hạn đọc báo
 * - [BF-01][Smart Summary] Cấp bản tóm tắt cho Free Reader; cấp toàn văn bài gốc cho Subscriber
 * - [BF-08][UC-31] Cung cấp danh mục vị trí quảng cáo và gói tài trợ B2B
 * ============================================================================
 */
@Service
@Transactional(readOnly = true)
public class PublicContentService {

    private final JdbcTemplate jdbc;

    public PublicContentService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Tìm kiếm và duyệt danh sách bài báo đã xuất bản công khai.
     */
    public List<ArticleSummaryResponse> searchArticles(String query, String category, int limit) {
        String term = query == null ? "" : query.trim();
        String categorySlug = category == null ? "" : category.trim();

        return jdbc.query("""
                SELECT DISTINCT 
                    a.article_id, a.title, a.slug, a.summary, a.thumbnail_url,
                    a.is_premium, a.views_count, a.published_at, a.source_name, a.source_url,
                    COALESCE(MIN(c.name), 'General') AS category_name
                FROM articles a
                LEFT JOIN article_categories ac ON ac.article_id = a.article_id
                LEFT JOIN categories c ON c.category_id = ac.category_id AND c.status = 'ACTIVE'
                WHERE a.status = 'PUBLISHED'
                  AND (? = '' OR a.title LIKE CONCAT('%', ?, '%') OR a.summary LIKE CONCAT('%', ?, '%'))
                  AND (? = '' OR c.slug = ?)
                GROUP BY 
                    a.article_id, a.title, a.slug, a.summary, a.thumbnail_url,
                    a.is_premium, a.views_count, a.published_at, a.source_name, a.source_url
                ORDER BY a.published_at DESC
                LIMIT ?
                """, (rs, rowNum) -> new ArticleSummaryResponse(
                    rs.getLong("article_id"), 
                    rs.getString("title"), 
                    rs.getString("slug"),
                    rs.getString("summary"), 
                    rs.getString("thumbnail_url"), 
                    rs.getBoolean("is_premium"),
                    rs.getLong("views_count"), 
                    instant(rs.getTimestamp("published_at")),
                    rs.getString("category_name"), 
                    rs.getString("source_name"), 
                    rs.getString("source_url")), 
                term, term, term, categorySlug, categorySlug,
                Math.max(1, Math.min(limit, 50)));
    }

    /**
     * ========================================================================
     * [BF-01][Smart Summary & Content Entitlement] TRUY XUẤT NỘI DUNG BÀI VIẾT
     * Phân quyền bảo mật ở tầng Backend API:
     * 1. Độc giả đã mua gói Premium (hasPremiumAccess == true):
     *    -> Nhận trọn vẹn 100% nội dung gốc bài báo, toàn bộ khối contentBlocks, hình ảnh chất lượng cao.
     * 2. Độc giả chưa mua gói (hasPremiumAccess == false):
     *    -> Backend CHỦ ĐỘNG GIẤU toàn bộ khối contentBlocks (null), contentMode = "SUMMARY_ONLY",
     *       chỉ trả về Bản tóm tắt (summary) và đoạn xem trước. Không thể xem lậu bằng F12 Inspect!
     * ========================================================================
     *
     * @param slug Đường dẫn tĩnh của bài báo
     * @param viewerId ID người dùng đang đọc (null nếu là khách vãng lai)
     * @return ArticleDetailResponse đã được phân quyền theo đúng gói thuê bao
     */
    public ArticleDetailResponse getArticle(String slug, Long viewerId) {
        List<ArticleDetailResponse> results = jdbc.query("""
                SELECT 
                    a.article_id, a.title, a.slug, a.summary, a.content, a.thumbnail_url,
                    a.is_premium, a.preview_percentage, a.views_count, a.published_at, a.source_name, a.source_url,
                    CAST(a.content_blocks AS CHAR) AS content_blocks,
                    a.content_mode,
                    a.source_author
                FROM articles a 
                WHERE a.slug = ? AND a.status = 'PUBLISHED'
                """, (rs, rowNum) -> {
            long id = rs.getLong("article_id");
            List<String> categories = jdbc.queryForList("""
                    SELECT c.name FROM categories c
                    JOIN article_categories ac ON ac.category_id = c.category_id
                    WHERE ac.article_id = ? AND c.status = 'ACTIVE' 
                    ORDER BY c.name
                    """, String.class, id);
            List<String> tags = jdbc.queryForList("""
                    SELECT t.name FROM tags t 
                    JOIN article_tags atg ON atg.tag_id = t.tag_id
                    WHERE atg.article_id = ? AND t.status = 'ACTIVE' 
                    ORDER BY t.name
                    """, String.class, id);

            return new ArticleDetailResponse(
                    id, 
                    rs.getString("title"), 
                    rs.getString("slug"),
                    rs.getString("summary"), 
                    rs.getString("content"), 
                    rs.getString("thumbnail_url"),
                    rs.getBoolean("is_premium"), 
                    rs.getInt("preview_percentage"),
                    rs.getLong("views_count"), 
                    instant(rs.getTimestamp("published_at")), 
                    categories, 
                    tags,
                    rs.getString("source_name"), 
                    rs.getString("source_url"), 
                    rs.getString("content_blocks"),
                    rs.getString("content_mode"), 
                    rs.getString("source_author"));
        }, slug);

        if (results.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy bài viết: " + slug);
        }

        ArticleDetailResponse article = results.getFirst();

        // [BF-01][Subscription Check] Kiểm tra độc giả có quyền Subscriber hay không
        if (hasPremiumAccess(viewerId)) {
            // Mở khóa toàn văn bài gốc cho người đã mua gói
            return article;
        }

        // Khóa bài gốc đối với độc giả miễn phí: chỉ gửi bản tóm tắt và đoạn xem trước
        return new ArticleDetailResponse(
                article.id(), 
                article.title(), 
                article.slug(), 
                article.summary(),
                preview(article.content(), article.previewPercentage()), 
                article.thumbnailUrl(),
                true, // Đánh dấu khóa premium đối với người chưa mua gói
                article.previewPercentage(), 
                article.views(), 
                article.publishedAt(),
                article.categories(), 
                article.tags(), 
                article.sourceName(), 
                article.sourceUrl(),
                null, // Withhold toàn bộ khối bài gốc chi tiết
                "SUMMARY_ONLY", 
                article.sourceAuthor());
    }

    /**
     * [BF-01][Subscription Check] Kiểm tra xem tài khoản người dùng có gói thuê bao ACTIVE còn hạn hay không.
     */
    private boolean hasPremiumAccess(Long viewerId) {
        if (viewerId == null) {
            return false;
        }
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM subscriptions
                WHERE user_id = ? 
                  AND status = 'ACTIVE'
                  AND start_at <= CURRENT_TIMESTAMP 
                  AND end_at > CURRENT_TIMESTAMP
                """, Integer.class, viewerId);

        return count != null && count > 0;
    }

    /**
     * Cắt đoạn trích mẫu bài viết theo tỷ lệ phần trăm xem trước an toàn.
     */
    private String preview(String content, int previewPercentage) {
        if (content == null || content.isBlank()) {
            return content;
        }
        int safePercentage = Math.max(5, Math.min(previewPercentage, 40));
        int end = Math.max(1, (int) Math.ceil(content.length() * safePercentage / 100.0));
        return content.substring(0, Math.min(end, content.length())).stripTrailing() + "…";
    }

    /**
     * [BF-01][UC-11] Cung cấp danh sách các gói cước The Pulse Premium đang hoạt động.
     */
    public List<SubscriptionPackageResponse> subscriptionPackages() {
        return jdbc.query("""
                SELECT 
                    package_id, code, name, description, price, currency, duration_days,
                    CAST(benefits AS CHAR) AS benefits
                FROM subscription_packages 
                WHERE status = 'ACTIVE'
                ORDER BY display_order, price
                """, (rs, rowNum) -> new SubscriptionPackageResponse(
                    rs.getLong("package_id"), 
                    rs.getString("code"), 
                    rs.getString("name"),
                    rs.getString("description"), 
                    rs.getBigDecimal("price"), 
                    rs.getString("currency"),
                    rs.getInt("duration_days"), 
                    rs.getString("benefits")));
    }

    /**
     * [BF-08][B2B Advertising] Cung cấp danh sách các gói tài trợ quảng cáo doanh nghiệp.
     */
    public List<AdvertisingOfferResponse> advertisingOffers() {
        return jdbc.query("""
                SELECT 
                    b2b_package_id, code, name, description, price, currency, duration_days, impressions_quota
                FROM b2b_packages 
                WHERE status = 'ACTIVE' 
                ORDER BY price
                """, (rs, rowNum) -> new AdvertisingOfferResponse(
                    rs.getLong("b2b_package_id"), 
                    rs.getString("code"), 
                    rs.getString("name"),
                    rs.getString("description"), 
                    rs.getBigDecimal("price"), 
                    rs.getString("currency"),
                    rs.getInt("duration_days"), 
                    rs.getLong("impressions_quota")));
    }

    /**
     * [BF-08][UC-31] Cung cấp danh mục các vị trí hiển thị quảng cáo (ad slots).
     */
    public List<AdSlotResponse> adSlots() {
        return jdbc.query("""
                SELECT 
                    slot_id, slot_name, position_code, page_scope, width_px, height_px, base_price, currency
                FROM ad_slots 
                WHERE status = 'ACTIVE' 
                ORDER BY base_price
                """, (rs, rowNum) -> new AdSlotResponse(
                    rs.getLong("slot_id"), 
                    rs.getString("slot_name"), 
                    rs.getString("position_code"),
                    rs.getString("page_scope"), 
                    rs.getInt("width_px"), 
                    rs.getInt("height_px"),
                    rs.getBigDecimal("base_price"), 
                    rs.getString("currency")));
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
