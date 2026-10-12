import { apiRequest } from "./apiClient.js";

// Purchasing screens must not silently substitute demo prices on API failure.
export function getActivePremiumPlans() {
  return apiRequest("/api/subscription-packages");
}
