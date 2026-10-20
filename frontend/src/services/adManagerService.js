import { apiRequest } from "./apiClient.js";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/**
 * ============================================================================
 * [BF-08] AD MANAGER & CAMPAIGN OPERATIONS SERVICE
 * Phụ trách: Cường (API Quản lý quảng cáo, Giám sát chiến dịch & Thao tác trạng thái)
 * ============================================================================
 */

export function getAdManagerDashboard(signal) {
    return apiRequest("/api/ad-manager/dashboard", { signal });
}

export function getPartnershipQueue(filters, signal) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value !== "" && value !== null && value !== undefined) query.set(key, value);
    }
    return apiRequest(`/api/ad-manager/partnerships?${query}`, { signal });
}

export function getPartnership(companyId, signal) {
    return apiRequest(`/api/ad-manager/partnerships/${encodeURIComponent(companyId)}`, { signal });
}

export function savePartnershipNote(companyId, applicationVersion, note) {
    return apiRequest(`/api/ad-manager/partnerships/${encodeURIComponent(companyId)}/note`, {
        method: "PUT",
        body: JSON.stringify({ applicationVersion, note }),
    });
}

export function decidePartnership(companyId, applicationVersion, decision, reason) {
    return apiRequest(`/api/ad-manager/partnerships/${encodeURIComponent(companyId)}/decision`, {
        method: "POST",
        body: JSON.stringify({ applicationVersion, decision, reason }),
    });
}

/**
 * [BF-08][ADM-09] Lấy danh sách toàn bộ chiến dịch quảng cáo kèm số liệu Impressions, Clicks, CTR.
 */
export function getActiveCampaigns(signal) {
    return apiRequest("/api/advertising/campaign-data", { signal });
}

/**
 * [BF-08][ADM-09][BUS-18] Lấy chuỗi số liệu hiệu suất theo ngày để vẽ biểu đồ SVG Trends.
 */
export function getPerformanceMetrics(signal) {
    return apiRequest("/api/advertising/performance", { signal });
}

/**
 * [BF-08][UC-39] TÍNH NĂNG CỐT LÕI: Tạm dừng hoặc Kích hoạt lại chiến dịch quảng cáo (ACTIVE <=> PAUSED).
 */
export function toggleCampaignStatus(campaignId) {
    return apiRequest(`/api/advertising/campaigns/${encodeURIComponent(campaignId)}/toggle-status`, {
        method: "POST",
    });
}

export function documentUrl(path) {
    return `${apiBaseUrl}${path}`;
}
