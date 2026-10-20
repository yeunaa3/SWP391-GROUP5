package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.content.AdSlotResponse;
import com.group5.premiumnews.dto.content.AdvertisingOfferResponse;
import com.group5.premiumnews.dto.content.ArticleDetailResponse;
import com.group5.premiumnews.dto.content.ArticleSummaryResponse;
import com.group5.premiumnews.dto.content.SubscriptionPackageResponse;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.PublicContentService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * ============================================================================
 * [BF-01][BF-08] PUBLIC CONTENT CONTROLLER
 * Phụ trách: Cường (API Bài viết, Gói cước Premium & Vị trí quảng cáo)
 * 
 * REST API Endpoints:
 * - GET /api/articles                   : Tìm kiếm & duyệt danh sách bài báo
 * - GET /api/articles/{slug}            : [BF-01] Xem chi tiết bài báo (tóm tắt cho Free Reader / toàn văn cho Subscriber)
 * - GET /api/subscription-packages      : [BF-01][UC-11] Danh mục gói cước Premium cho độc giả
 * - GET /api/advertising/offers         : [BF-08] Danh mục gói tài trợ doanh nghiệp B2B
 * - GET /api/advertising/slots          : [BF-08][UC-31] Danh mục vị trí slot quảng cáo
 * ============================================================================
 */
@RestController
@RequestMapping("/api")
public class PublicContentController {

    private final PublicContentService service;

    public PublicContentController(PublicContentService service) {
        this.service = service;
    }

    /**
     * Tìm kiếm và duyệt bài viết công khai.
     */
    @GetMapping("/articles")
    public List<ArticleSummaryResponse> articles(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "20") int limit) {
        return service.searchArticles(query, category, limit);
    }

    /**
     * [BF-01][Smart Summary & Content Delivery] Chi tiết bài báo theo slug.
     * Tự động kiểm tra authentication principal:
     * - Nếu là Subscriber: nhận full content_blocks và toàn văn bài gốc.
     * - Nếu là Free Reader / Guest: nhận bản tóm tắt (summary) và khóa bài gốc.
     */
    @GetMapping("/articles/{slug}")
    public ArticleDetailResponse article(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.getArticle(slug, principal == null ? null : principal.id());
    }

    /**
     * [BF-01][UC-11] Lấy danh sách các gói cước The Pulse Premium đang hoạt động.
     */
    @GetMapping("/subscription-packages")
    public List<SubscriptionPackageResponse> subscriptionPackages() {
        return service.subscriptionPackages();
    }

    /**
     * [BF-08] Lấy danh mục các gói tài trợ quảng cáo B2B.
     */
    @GetMapping("/advertising/offers")
    public List<AdvertisingOfferResponse> advertisingOffers() {
        return service.advertisingOffers();
    }

    /**
     * [BF-08][UC-31] Lấy danh mục các vị trí đặt biểu ngữ quảng cáo.
     */
    @GetMapping("/advertising/slots")
    public List<AdSlotResponse> adSlots() {
        return service.adSlots();
    }
}
