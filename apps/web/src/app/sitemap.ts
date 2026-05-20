import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shardveil.xyz";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static routes ────────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/whitepaper`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/roadmap`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/hall-of-fame`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/cards`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
  ];

  // ── Dynamic card routes — fetch up to 1000 ───────────────────────────────────
  let cardRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/cards?limit=1000`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = (await res.json()) as { cards: Array<{ id: number }> };
      cardRoutes = data.cards.map((card) => ({
        url: `${BASE_URL}/cards/${card.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch {
    /* API not available at build time */
  }

  return [...staticRoutes, ...cardRoutes];
}
