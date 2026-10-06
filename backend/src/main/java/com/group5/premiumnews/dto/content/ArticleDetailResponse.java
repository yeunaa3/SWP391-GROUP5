package com.group5.premiumnews.dto.content;

import java.time.Instant;
import java.util.List;

public record ArticleDetailResponse(
        Long id,
        String title,
        String slug,
        String summary,
        String content,
        String thumbnailUrl,
        boolean premium,
        int previewPercentage,
        long views,
        Instant publishedAt,
        List<String> categories,
        List<String> tags,
        String sourceName,
        String sourceUrl) {
}
