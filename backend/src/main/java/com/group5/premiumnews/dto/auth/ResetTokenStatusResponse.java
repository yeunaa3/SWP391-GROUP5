package com.group5.premiumnews.dto.auth;

public record ResetTokenStatusResponse(
        boolean valid,
        String maskedEmail,
        String message
) {}
