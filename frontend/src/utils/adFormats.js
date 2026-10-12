// Presentation sizes only: keep the existing inventory/API placement IDs unchanged.
export const adFormats = {
  HEADER_BANNER: { name: "leaderboard", size: "970 × 90" },
  HOME_HERO: { name: "billboard", size: "970 × 250" },
  ARTICLE_TOP: { name: "ribbon", size: "728 × 90" },
  ARTICLE_SIDEBAR: { name: "skyscraper", size: "300 × 600" },
  IN_ARTICLE: { name: "rectangle", size: "300 × 250" },
  END_OF_ARTICLE: { name: "native", size: "728 × 180" },
};

export function adFormat(position) {
  return adFormats[position] || adFormats.HOME_HERO;
}
