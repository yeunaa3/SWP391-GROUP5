/**
 * =================================================================================================
 * SERVICE: AUTHENTICATION API CLIENT (DỊCH VỤ XÁC THỰC PHÍA FRONTEND)
 * =================================================================================================
 * 
 * Chịu trách nhiệm giao tiếp HTTP với các endpoint `/api/auth/*` trên Backend Spring Boot:
 * - Tự động đính kèm Cookie phiên làm việc (Session Cookie) và CSRF Token (X-XSRF-TOKEN).
 * - Xử lý chuyển đổi dữ liệu JSON và giải mã thông báo lỗi từ máy chủ.
 * =================================================================================================
 */

import { apiRequest } from "./apiClient.js";

/**
 * Lấy thông tin tài khoản người dùng đang đăng nhập từ Session hiện tại (UC-06).
 * 
 * @returns {Promise<Object>} Thông tin tài khoản AuthenticatedUserResponse
 */
export function getCurrentUser() {
    return apiRequest("/api/auth/me");
}

/**
 * Đăng nhập hệ thống bằng tên đăng nhập (hoặc email) và mật khẩu (UC-06 / AUTH-01).
 * 
 * @param {Object} credentials - Đối tượng { login, password }
 * @returns {Promise<Object>} Thông tin tài khoản sau khi đăng nhập thành công
 */
export function login(credentials) {
    return apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
    });
}

/**
 * Đăng ký tài khoản mới cho Độc giả hoặc Doanh nghiệp (UC-05 / AUTH-02).
 * 
 * @param {Object} account - Dữ liệu đăng ký { username, email, password, confirmPassword, fullName, phoneNumber, ... }
 * @returns {Promise<Object>} Thông tin tài khoản vừa tạo
 */
export function registerAccount(account) {
    return apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(account)
    });
}

/**
 * Đăng xuất khỏi hệ thống và hủy bỏ phiên làm việc bảo mật (UC-09).
 * 
 * @returns {Promise<null>}
 */
export function logout() {
    return apiRequest("/api/auth/logout", {
        method: "POST"
    });
}

/**
 * Gửi yêu cầu khôi phục mật khẩu qua Email (UC-07 / AUTH-03).
 * Backend sẽ sinh mã token ngẫu nhiên bảo mật 32-byte và gửi đường dẫn xác thực tới email người dùng.
 * 
 * @param {string} identifier - Tên đăng nhập hoặc địa chỉ email đã đăng ký
 * @returns {Promise<Object>} Thông điệp xác nhận từ máy chủ
 */
export function requestPasswordReset(identifier) {
    return apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier })
    });
}

/**
 * Xác thực tính hợp lệ của Token khi người dùng mở liên kết từ Email (UC-07 / AUTH-04).
 * Kiểm tra xem token có tồn tại, còn hạn 15 phút và chưa bị sử dụng hay không.
 * 
 * @param {string} token - Mã token bí mật trích xuất từ query parameter (?token=...)
 * @returns {Promise<{ valid: boolean, maskedEmail: string, message: string }>}
 */
export function verifyResetToken(token) {
    return apiRequest(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
}

/**
 * Gửi mật khẩu mới kèm token để hoàn tất quá trình đổi mật khẩu (UC-07 / AUTH-04).
 * Backend sẽ băm mật khẩu bằng BCrypt và cập nhật vào cơ sở dữ liệu.
 * 
 * @param {Object} payload - Đối tượng { token, newPassword }
 * @returns {Promise<{ message: string }>} Thông điệp thành công từ máy chủ
 */
export function resetPassword({ token, newPassword }) {
    return apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword })
    });
}
