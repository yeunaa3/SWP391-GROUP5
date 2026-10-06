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

@RestController
@RequestMapping("/api")
public class PublicContentController {

    private final PublicContentService service;

    public PublicContentController(PublicContentService service) {
        this.service = service;
    }

    @GetMapping("/articles")
    public List<ArticleSummaryResponse> articles(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "20") int limit) {
        return service.searchArticles(query, category, limit);
    }

    @GetMapping("/articles/{slug}")
    public ArticleDetailResponse article(
            @PathVariable String slug,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return service.getArticle(slug, principal == null ? null : principal.id());
    }

    @GetMapping("/subscription-packages")
    public List<SubscriptionPackageResponse> subscriptionPackages() {
        return service.subscriptionPackages();
    }

    @GetMapping("/advertising/offers")
    public List<AdvertisingOfferResponse> advertisingOffers() {
        return service.advertisingOffers();
    }

    @GetMapping("/advertising/slots")
    public List<AdSlotResponse> adSlots() {
        return service.adSlots();
    }
}
