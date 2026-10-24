const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
        async function ensureCsrfToken() {
            // Lấy token chống giả mạo yêu cầu; trả token để gắn vào header của POST đăng ký.
            // Spring's default XOR handler expects the masked response token, not the
            // raw cookie value. Refresh it for every mutation, including after login/restart.
            const response = await fetch(`${apiBaseUrl}/api/auth/csrf`, {
                headers: {Accept: "application/json"},
                credentials: "include",
            });
            if (!response.ok)
                throw new Error("Unable to initialize a secure request");
            return (await response.json()).token;
        }

export async function apiRequest(path, options = {}, retryCsrf = true) {
    // Hàm HTTP dùng chung: gửi JSON/cookie/token, trả dữ liệu hoặc ném Error chứa message từ backend.
    const method = (options.method || "GET").toUpperCase();
    const csrfHeader = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
            ? {"X-XSRF-TOKEN": await ensureCsrfToken()}
    : {};
    const response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body && !(options.body instanceof FormData) ? {"Content-Type": "application/json"} : {}),
            ...csrfHeader,
            ...options.headers,
        },
        credentials: "include",
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        // Chỉ retry khi filter xác nhận request chưa vào nghiệp vụ vì CSRF; không retry POST khi lỗi mạng/save không rõ kết quả.
        if (response.status === 403 && body?.code === "CSRF_INVALID" && retryCsrf)
            return apiRequest(path, options, false);
        const error = new Error(body?.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.code = body?.code;
        throw error;
    }

    // DELETE/review có thể trả 200 không có body; thao tác vẫn thành công, không cố parse JSON rỗng.
    const content = await response.text();
    return content ? JSON.parse(content) : null;
}
