import { apiRequest } from "./apiClient.js";

export const getAdminPackages = () => apiRequest("/api/admin/packages");

export const getPackageById = (id) => apiRequest(`/api/admin/packages/${id}`);

export const createPackage = (data) =>
  apiRequest("/api/admin/packages", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updatePackage = (id, data) =>
  apiRequest(`/api/admin/packages/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const togglePackageStatus = (id, active) =>
  apiRequest(`/api/admin/packages/${id}/status?active=${active}`, {
    method: "PATCH",
  });

export const deletePackage = (id) =>
  apiRequest(`/api/admin/packages/${id}`, {
    method: "DELETE",
  });

export const getPublicPackages = () => apiRequest("/api/public/packages");
