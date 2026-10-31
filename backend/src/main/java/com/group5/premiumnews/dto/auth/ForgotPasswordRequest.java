package com.group5.premiumnews.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc email.")
        String identifier
) {}
