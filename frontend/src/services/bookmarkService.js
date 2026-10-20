import { apiRequest } from "./apiClient.js";

const BOOKMARKS_API = "/api/bookmarks";

export function getBookmarks(page, pageSize, signal) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(pageSize),
  });

  return apiRequest(`${BOOKMARKS_API}?${params}`, { signal });
}

export function getBookmarkStatus(articleId, signal) {
  return apiRequest(`${BOOKMARKS_API}/${articleId}`, { signal });
}

export function saveBookmark(articleId) {
  return apiRequest(`${BOOKMARKS_API}/${articleId}`, { method: "PUT" });
}

export function removeBookmark(articleId) {
  return apiRequest(`${BOOKMARKS_API}/${articleId}`, { method: "DELETE" });
}
