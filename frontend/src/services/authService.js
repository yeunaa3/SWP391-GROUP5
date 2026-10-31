import { apiRequest } from "./apiClient.js";

export function getCurrentUser() {
    return apiRequest("/api/auth/me");
}

export function login(credentials) {
    // UC-06: gửi username/email và mật khẩu; apiRequest kèm CSRF và cookie session.
    return apiRequest("/api/auth/login", {method: "POST", body: JSON.stringify(credentials)});
}

export function registerAccount(account) {
    // UC-05: chuyển dữ liệu form thành JSON và gửi POST; apiRequest xử lý CSRF, cookie và lỗi HTTP.
    return apiRequest("/api/auth/register", {method: "POST", body: JSON.stringify(account)});
}

export function logout() {
    return apiRequest("/api/auth/logout", {method: "POST"});
}

export function requestPasswordReset(identifier) {
    return apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier })
    });
}

export function verifyResetToken(token) {
    return apiRequest(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
}

export function resetPassword({ token, newPassword }) {
    return apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword })
    });
}
