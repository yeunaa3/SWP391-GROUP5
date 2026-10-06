import { apiRequest } from "./apiClient.js";
import { demoAdOffers, demoAdSlots, demoArticles, demoPackages } from "../data/demoData.js";

async function withFallback(request, fallback) {
  try {
    return { data: await request(), demo: false };
  } catch {
    return { data: fallback, demo: true };
  }
}

export function getArticles({ query = "", category = "", limit = 20 } = {}) {
  const params = new URLSearchParams({ query, category, limit: String(limit) });
  const filtered = demoArticles.filter((article) => {
    const matchesQuery = !query || `${article.title} ${article.summary}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || article.category.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesCategory;
  }).slice(0, limit);
  return withFallback(() => apiRequest(`/api/articles?${params}`), filtered);
}

export function getArticle(slug) {
  return withFallback(
    () => apiRequest(`/api/articles/${encodeURIComponent(slug)}`),
    demoArticles.find((article) => article.slug === slug) || demoArticles[0],
  );
}

export function getSubscriptionPackages() {
  return withFallback(() => apiRequest("/api/subscription-packages"), demoPackages);
}

export function getAdvertisingCatalog() {
  return Promise.all([
    withFallback(() => apiRequest("/api/advertising/offers"), demoAdOffers),
    withFallback(() => apiRequest("/api/advertising/slots"), demoAdSlots),
  ]).then(([offers, slots]) => ({ offers: offers.data, slots: slots.data, demo: offers.demo || slots.demo }));
}
