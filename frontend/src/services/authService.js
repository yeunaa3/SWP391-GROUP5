import { apiRequest } from "./apiClient.js";

export function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

export function login(credentials) {
  return apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function registerAccount(account) {
  return apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(account) });
}

export function logout() {
  return apiRequest("/api/auth/logout", { method: "POST" });
}
