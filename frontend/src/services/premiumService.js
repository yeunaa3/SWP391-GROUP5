import { apiRequest } from "./apiClient.js";

// Purchasing screens must not silently substitute demo prices on API failure.
export function getActivePremiumPlans() {
  return apiRequest("/api/subscription-packages");
}

export const submitPremiumRequest = packageId => apiRequest("/api/premium/requests", { method: "POST", body: JSON.stringify({ packageId: Number(packageId) }) });
export const getMyPremiumRequests = () => apiRequest("/api/premium/requests");
export const getPremiumReviewQueue = () => apiRequest("/api/admin/premium-requests");
export const reviewPremiumRequest = (id, decision) => apiRequest(`/api/admin/premium-requests/${id}/review`, { method: "POST", body: JSON.stringify(decision) });
