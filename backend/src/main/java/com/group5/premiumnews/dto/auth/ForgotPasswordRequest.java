package com.group5.premiumnews.dto.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO tiếp nhận yêu cầu Quên mật khẩu từ client (UC-07 / AUTH-03).
 * 
 * @param identifier Tên đăng nhập (username) hoặc địa chỉ email của tài khoản
 */
public record ForgotPasswordRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập hoặc địa chỉ email.")
        String identifier
) {}
