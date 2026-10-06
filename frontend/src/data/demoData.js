export const demoArticles = [
  {
    id: 1,
    title: "Vietnam digital economy enters a new growth cycle",
    slug: "vietnam-digital-economy-growth-cycle",
    summary: "Businesses are accelerating cloud, payment and data investments as domestic demand expands.",
    content: "Vietnamese enterprises are entering a new phase of digital investment. The change is visible in retail, payments, logistics and public services. Leaders are focusing less on isolated experiments and more on measurable operating outcomes.\n\nThe next phase will depend on trusted data, skilled teams and sustainable investment. Companies that connect customer experience with reliable internal systems are likely to move faster than competitors.",
    thumbnailUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
    premium: false,
    previewPercentage: 20,
    views: 18420,
    category: "Business",
    categories: ["Business"],
    tags: ["Market"],
    publishedAt: "2026-10-05T08:00:00Z",
  },
  {
    id: 2,
    title: "Inside the race to build responsible AI products",
    slug: "responsible-ai-products",
    summary: "A practical look at how product teams balance model capability, safety and user trust.",
    content: "Artificial intelligence products are moving from prototypes into everyday workflows. That transition changes the work: teams must evaluate quality, safety, latency and cost at the same time.\n\nSuccessful programs define measurable use cases before choosing a model. They also keep humans in the loop for sensitive decisions and monitor outcomes after launch.\n\nPremium analysis: the strongest teams treat evaluation as a product capability, not a final checklist. They create repeatable datasets, incident processes and feedback loops that improve with each release.",
    thumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80",
    premium: true,
    previewPercentage: 35,
    views: 12680,
    category: "Technology",
    categories: ["Technology"],
    tags: ["Artificial Intelligence"],
    publishedAt: "2026-10-04T08:00:00Z",
  },
  {
    id: 3,
    title: "New logistics corridors reshape regional trade",
    slug: "logistics-corridors-regional-trade",
    summary: "Infrastructure investment is shortening delivery times and opening new routes for manufacturers.",
    content: "New transport corridors are changing how goods move across the region. Manufacturers are reassessing warehouse locations, inventory policies and supplier relationships.\n\nThe largest gains will come from coordinated planning across ports, roads and digital customs systems.",
    thumbnailUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    premium: false,
    previewPercentage: 20,
    views: 9340,
    category: "Business",
    categories: ["Business"],
    tags: ["Market"],
    publishedAt: "2026-10-03T08:00:00Z",
  },
  {
    id: 4,
    title: "Data-driven agriculture moves beyond the pilot stage",
    slug: "data-driven-agriculture",
    summary: "Farm cooperatives are using sensors and forecasts to reduce waste and improve crop planning.",
    content: "Digital agriculture is becoming more practical as sensors, satellite data and weather forecasts become easier to use. Cooperatives are applying these tools to irrigation, fertilizer planning and disease detection.\n\nPremium analysis: adoption still depends on simple interfaces, local support and business models that work for small farms.",
    thumbnailUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1400&q=80",
    premium: true,
    previewPercentage: 30,
    views: 7850,
    category: "Agriculture",
    categories: ["Agriculture"],
    tags: ["Sustainability"],
    publishedAt: "2026-10-02T08:00:00Z",
  },
];

export const demoPackages = [
  { id: 1, code: "PREMIUM_MONTHLY", name: "Monthly Premium", description: "Flexible access for regular readers.", price: 79000, currency: "VND", durationDays: 30, benefits: '["All Premium articles","Ad-light reading","Bookmark library"]' },
  { id: 2, code: "PREMIUM_YEARLY", name: "Annual Premium", description: "Best value for committed readers.", price: 790000, currency: "VND", durationDays: 365, benefits: '["All Premium articles","Ad-light reading","Bookmark library","Priority support"]' },
];

export const demoAdOffers = [
  { id: 1, code: "AWARENESS_100K", name: "Brand Awareness", description: "A starter campaign for broad reach.", price: 15000000, currency: "VND", durationDays: 30, impressionsQuota: 100000 },
  { id: 2, code: "GROWTH_500K", name: "Growth Campaign", description: "Extended delivery with detailed reporting.", price: 55000000, currency: "VND", durationDays: 60, impressionsQuota: 500000 },
  { id: 3, code: "PREMIUM_1M", name: "Premium Reach", description: "High-volume delivery across premium placements.", price: 95000000, currency: "VND", durationDays: 90, impressionsQuota: 1000000 },
];

export const demoAdSlots = [
  { id: 1, name: "Homepage Hero", positionCode: "HOME_HERO", pageScope: "HOME", width: 1200, height: 300, basePrice: 12000000, currency: "VND" },
  { id: 2, name: "Article Leaderboard", positionCode: "ARTICLE_TOP", pageScope: "ARTICLE", width: 970, height: 250, basePrice: 8000000, currency: "VND" },
  { id: 3, name: "Article Sidebar", positionCode: "ARTICLE_SIDEBAR", pageScope: "ARTICLE", width: 300, height: 600, basePrice: 5000000, currency: "VND" },
];
