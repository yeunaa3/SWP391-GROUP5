package com.group5.premiumnews.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Token đặt lại mật khẩu không được để trống.")
        String token,

        @NotBlank(message = "Mật khẩu mới không được để trống.")
        @Size(min = 8, max = 64, message = "Mật khẩu phải từ 8 đến 64 ký tự.")
        String newPassword
) {}
