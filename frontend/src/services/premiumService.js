import { apiRequest } from "./apiClient.js";

/**
 * ============================================================================
 * [BF-01] DỊCH VỤ GỌI API PREMIUM (PREMIUM SERVICE)
 * 
 * Lưu ý quan trọng cho người đọc code:
 * File này chỉ đóng vai trò "người đưa thư" (HTTP client) gửi yêu cầu lên Backend:
 * - Khi gọi getPremiumAccess(), Backend trả về một gói dữ liệu JSON chứa:
 *     { hasAccess: true, subscriptions: [...] }
 * - Do đó, `subscriptions` là DỮ LIỆU JSON trả về từ Database, KHÔNG PHẢI file mã nguồn,
 *   nên ở đây KHÔNG CẦN và KHÔNG THỂ `import subscriptions`.
 * ============================================================================
 */

// 1. Lấy thông tin quyền truy cập Premium và danh sách gói đã mua của user hiện tại
export const getPremiumAccess = () => {
  return apiRequest("/api/premium/access");
};

// 2. Lấy danh sách gói cước Premium đang mở bán từ cơ sở dữ liệu
export function getActivePremiumPlans() {
  return apiRequest("/api/subscription-packages");
}

// 3. Gửi yêu cầu mua gói mới (tạo đơn hàng chờ thanh toán)
export const submitPremiumRequest = (packageId) => {
  return apiRequest("/api/premium/requests", {
    method: "POST",
    body: JSON.stringify({ packageId: Number(packageId) }),
  });
};

// 4. Hủy một yêu cầu mua gói đang chờ duyệt
export const cancelPremiumRequest = (id) => {
  return apiRequest(`/api/premium/requests/${id}/cancel`, {
    method: "POST",
  });
};

// 5. Lấy danh sách các yêu cầu mua gói của người dùng hiện tại
export const getMyPremiumRequests = () => {
  return apiRequest("/api/premium/requests");
};

// 6. Lấy lịch sử giao dịch và biên lai của người dùng hiện tại
export const getMyTransactions = () => {
  return apiRequest("/api/premium/transactions");
};

// 7. Lấy chi tiết một giao dịch cụ thể
export const getTransactionDetail = (id) => {
  return apiRequest(`/api/premium/transactions/${id}`);
};

// 8. [Dành cho Admin] Lấy hàng đợi các yêu cầu mua gói cần duyệt
export const getPremiumReviewQueue = () => {
  return apiRequest("/api/admin/premium-requests");
};

// 9. [Dành cho Admin] Phê duyệt hoặc từ chối một yêu cầu mua gói
export const reviewPremiumRequest = (id, decision) => {
  return apiRequest(`/api/admin/premium-requests/${id}/review`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
};

/**
 * ============================================================================
 * [CFG-03][C2B] Quản lý danh mục gói cước Premium (Admin Package Management)
 * ============================================================================
 */

// Lấy toàn bộ danh sách gói cước (kể cả gói ẩn/tắt)
export const getAdminPackages = () => {
  return apiRequest("/api/admin/packages");
};

// Tạo một gói cước mới
export const createAdminPackage = (payload) => {
  return apiRequest("/api/admin/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// Cập nhật thông tin gói cước
export const updateAdminPackage = (id, payload) => {
  return apiRequest(`/api/admin/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

// Bật / tắt trạng thái kích hoạt của gói cước
export const toggleAdminPackageStatus = (id) => {
  return apiRequest(`/api/admin/packages/${id}/toggle`, {
    method: "PATCH",
  });
};

// Xóa gói cước
export const deleteAdminPackage = (id) => {
  return apiRequest(`/api/admin/packages/${id}`, {
    method: "DELETE",
  });
};
