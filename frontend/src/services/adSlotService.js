import { apiRequest } from "./apiClient.js";

export function getAdminAdSlots(signal) {
  return apiRequest("/api/admin/ad-slots", { signal });
}

export function createAdminAdSlot(slot) {
  return apiRequest("/api/admin/ad-slots", {
    method: "POST",
    body: JSON.stringify(slot),
  });
}

export function updateAdminAdSlot(id, slot) {
  return apiRequest(`/api/admin/ad-slots/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(slot),
  });
}