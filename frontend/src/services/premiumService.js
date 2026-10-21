import { apiRequest } from "./apiClient.js";

export const getPremiumAccess = () => apiRequest("/api/premium/access");

// Purchasing screens must not silently substitute demo prices on API failure.
export function getActivePremiumPlans() {
  return apiRequest("/api/subscription-packages");
}

export const submitPremiumRequest = packageId => apiRequest("/api/premium/requests", { method: "POST", body: JSON.stringify({ packageId: Number(packageId) }) });
export const cancelPremiumRequest = id => apiRequest(`/api/premium/requests/${id}/cancel`, { method: "POST" });
export const getMyPremiumRequests = () => apiRequest("/api/premium/requests");
export const getMyTransactions = () => apiRequest("/api/premium/transactions");
export const getTransactionDetail = id => apiRequest(`/api/premium/transactions/${id}`);
export const getPremiumReviewQueue = () => apiRequest("/api/admin/premium-requests");
export const reviewPremiumRequest = (id, decision) => apiRequest(`/api/admin/premium-requests/${id}/review`, { method: "POST", body: JSON.stringify(decision) });
