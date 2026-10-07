const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function ensureCsrfToken() {
  // Spring's default XOR handler expects the masked response token, not the
  // raw cookie value. Refresh it for every mutation, including after login/restart.
    const response = await fetch(`${apiBaseUrl}/api/auth/csrf`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Unable to initialize a secure request");
    return (await response.json()).token;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const csrfHeader = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ? { "X-XSRF-TOKEN": await ensureCsrfToken() }
    : {};
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...csrfHeader,
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed with status ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}
