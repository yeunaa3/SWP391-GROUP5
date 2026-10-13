package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.common.PageResponse;
import com.group5.premiumnews.dto.content.ArticleSummaryResponse;
import com.group5.premiumnews.service.ArticleSearchService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/articles")
public class ArticleSearchController {

    private final ArticleSearchService service;

    public ArticleSearchController(ArticleSearchService service) {
        this.service = service;
    }

    @GetMapping("/categories")
    public List<ArticleSearchService.Category> categories() {
        return service.categories();
    }

    @GetMapping("/search")
    public PageResponse<ArticleSummaryResponse> search(
        @RequestParam(defaultValue = "") String query,
        @RequestParam(defaultValue = "") String category,
        @RequestParam(defaultValue = "all") String access,
        @RequestParam(required = false) LocalDate from,
        @RequestParam(required = false) LocalDate to,
        @RequestParam(defaultValue = "newest") String sort,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "12") int size
    ) {
        return service.search(
            query,
            category,
            access,
            from,
            to,
            sort,
            page,
            size
        );
    }
}
