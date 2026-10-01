import { apiRequest } from "./apiClient.js";

export function getBackendHealth() {
  return apiRequest("/api/health");
}
