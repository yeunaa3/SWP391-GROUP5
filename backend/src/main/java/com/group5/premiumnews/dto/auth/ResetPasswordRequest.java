package com.group5.premiumnews.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO tiếp nhận thông tin Đặt lại mật khẩu mới từ client (UC-07 / AUTH-04).
 * 
 * @param token        Mã token ngẫu nhiên bảo mật nhận từ email
 * @param newPassword  Mật khẩu mới (tuân thủ quy định SRS: tối thiểu 8 ký tự, tối đa 64 ký tự)
 */
public record ResetPasswordRequest(
        @NotBlank(message = "Mã xác thực đặt lại mật khẩu không được để trống.")
        String token,

        @NotBlank(message = "Mật khẩu mới không được để trống.")
        @Size(min = 8, max = 64, message = "Mật khẩu mới phải từ 8 đến 64 ký tự.")
        String newPassword
) {}
