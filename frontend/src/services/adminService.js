import { apiRequest } from "./apiClient.js";
export const getAdminOverview = (days, signal) => apiRequest(`/api/admin/overview?days=${days}`, { signal });
