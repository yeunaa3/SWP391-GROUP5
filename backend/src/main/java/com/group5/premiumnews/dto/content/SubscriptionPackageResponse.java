package com.group5.premiumnews.dto.content;

import java.math.BigDecimal;

public record SubscriptionPackageResponse(
        Long id,
        String code,
        String name,
        String description,
        BigDecimal price,
        String currency,
        int durationDays,
        String benefits) {
}
