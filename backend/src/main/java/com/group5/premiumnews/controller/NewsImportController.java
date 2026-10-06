package com.group5.premiumnews.controller;

import com.group5.premiumnews.service.RssImportService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/news-import")
@ConditionalOnProperty(name = "app.news-import.enabled", havingValue = "true")
public class NewsImportController {
    private final RssImportService importer;
    public NewsImportController(RssImportService importer) { this.importer = importer; }
    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public Map<String, Object> run() { return importer.importFeeds(); }
}
