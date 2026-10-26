import { apiRequest } from "./apiClient.js";

export function getAdminB2bPackages(signal) {
  return apiRequest("/api/admin/b2b-packages", { signal });
}

export function createAdminB2bPackage(data) {
  return apiRequest("/api/admin/b2b-packages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminB2bPackage(id, data) {
  return apiRequest(`/api/admin/b2b-packages/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}