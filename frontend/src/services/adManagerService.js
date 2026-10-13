import { apiRequest } from "./apiClient.js";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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

export function documentUrl(path) {
    return `${apiBaseUrl}${path}`;
}
