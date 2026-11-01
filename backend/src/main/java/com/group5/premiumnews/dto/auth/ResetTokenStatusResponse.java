package com.group5.premiumnews.dto.auth;

/**
 * DTO trả về kết quả kiểm tra tính hợp lệ của Token đặt lại mật khẩu (UC-07 / AUTH-04).
 * 
 * @param valid        true nếu token tồn tại, chưa sử dụng và chưa hết hạn 15 phút
 * @param maskedEmail  Địa chỉ email của tài khoản đã được che bớt ký tự (ví dụ: b***6@gmail.com)
 * @param message      Thông điệp trạng thái chi tiết hướng dẫn người dùng
 */
public record ResetTokenStatusResponse(
        boolean valid,
        String maskedEmail,
        String message
) {}
