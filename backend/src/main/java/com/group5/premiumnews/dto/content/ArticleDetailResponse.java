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
        String sourceUrl,
        String contentBlocks,
        String contentMode,
        String sourceAuthor) {
    public ArticleDetailResponse(Long id, String title, String slug, String summary, String content,
            String thumbnailUrl, boolean premium, int previewPercentage, long views, Instant publishedAt,
            List<String> categories, List<String> tags, String sourceName, String sourceUrl) {
        this(id,title,slug,summary,content,thumbnailUrl,premium,previewPercentage,views,publishedAt,
                categories,tags,sourceName,sourceUrl,null,sourceUrl == null ? "LOCAL" : "RSS",null);
    }
}
