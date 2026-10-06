package com.group5.premiumnews.dto.content;

import java.math.BigDecimal;

public record AdSlotResponse(
        Long id,
        String name,
        String positionCode,
        String pageScope,
        int width,
        int height,
        BigDecimal basePrice,
        String currency) {
}
