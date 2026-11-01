import { matchPath } from "react-router-dom";
import { screens } from "../routes/screenCatalog.js";

// Trang chủ mặc định sau khi đăng nhập thành công
export const LOGIN_SUCCESS_PATH = "/";

/**
 * Chọn trang chủ mặc định (Workspace) theo Role của người dùng:
 * - Tài khoản có nhiều Role thì ưu tiên: ADMIN -> MANAGER -> BUSINESS -> PROFILE (READER)
 */
export function workspaceHome(user) {
    const roles = user?.roles || [];

    // 1. Quản trị viên hệ thống
    if (roles.includes("ADMINISTRATOR")) {
        return "/admin";
    }

    // 2. Quản lý quảng cáo
    if (roles.includes("AD_MANAGER")) {
        return "/ad-manager";
    }

    // 3. Doanh nghiệp đối tác
    if (roles.includes("BUSINESS")) {
        return "/business";
    }

    // 4. Độc giả bình thường (Reader / Subscriber)
    return "/account/profile";
}

/**
 * Kiểm tra đường dẫn quay lại (returnTo) có an toàn và đúng quyền Role không:
 * Nếu hợp lệ thì quay lại đúng trang đó, nếu không thì đưa về workspaceHome.
 */
export function safeReturnTo(path, user) {
    // 1. Kiểm tra đường dẫn có bắt đầu bằng "/" hợp lệ không
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
        return workspaceHome(user);
    }

    // 2. Tìm màn hình trong catalog khớp với path này
    const cleanPath = path.split(/[?#]/)[0];
    const screen = screens.find((item) =>
        matchPath({ path: item.path, end: true }, cleanPath)
    );

    // 3. Nếu không tìm thấy màn hoặc là trang auth (login/register) thì về trang chủ role
    if (!screen || screen.area === "auth") {
        return workspaceHome(user);
    }

    // 4. Kiểm tra quyền role:
    // Màn hình không yêu cầu role HOẶC user có role phù hợp thì cho phép quay lại
    const isPublic = !screen.roles || screen.roles.length === 0;
    const hasRole = screen.roles && screen.roles.some((role) => user?.roles?.includes(role));

    if (isPublic || hasRole) {
        return path;
    }

    return workspaceHome(user);
}
