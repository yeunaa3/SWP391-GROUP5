package com.group5.premiumnews.dto.content;

import java.time.Instant;

public record ArticleSummaryResponse(
        Long id,
        String title,
        String slug,
        String summary,
        String thumbnailUrl,
        boolean premium,
        long views,
        Instant publishedAt,
        String category,
        String sourceName,
        String sourceUrl) {
}
