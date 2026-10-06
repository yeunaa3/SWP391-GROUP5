const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function readCookie(name) {
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : null;
}

async function ensureCsrfToken() {
  let token = readCookie("XSRF-TOKEN");
  if (!token) {
    const response = await fetch(`${apiBaseUrl}/api/auth/csrf`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error("Unable to initialize a secure request");
    token = (await response.json()).token;
  }
  return token;
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
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
