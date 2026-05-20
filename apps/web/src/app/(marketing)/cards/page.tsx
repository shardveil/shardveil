import type { Metadata } from "next";
import { Suspense } from "react";

import { CardFilters } from "@/components/cards/CardFilters";
import { CardGrid } from "@/components/cards/CardGrid";
import { CardSearchInput } from "@/components/cards/CardSearchInput";
import { type CardData } from "@/components/cards/CardThumbnail";

// ─── Revalidation ─────────────────────────────────────────────────────────────

export const revalidate = 60;

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shardveil.xyz";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Card Catalog",
  description: "Browse all registered cards in ShardVeil.",
  alternates: {
    canonical: `${BASE_URL}/cards`,
  },
  openGraph: {
    title: "Card Catalog | ShardVeil",
    description:
      "Browse all registered cards in the ShardVeil dark fantasy card game.",
    type: "website",
    images: [`${BASE_URL}/api/og/landing`],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${BASE_URL}/api/og/landing`],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface CardsApiResponse {
  cards: Array<{
    id: number;
    name: string;
    rarity: string;
    imageUrl: string | null;
    minted: string | number;
    supplyCap: string | number;
    power?: number;
  }>;
  total: number;
  page: number;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchFirstPage(): Promise<{
  cards: CardData[];
  total: number;
}> {
  try {
    const res = await fetch(`${API_URL}/cards?limit=24`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("unavailable");
    const data = (await res.json()) as CardsApiResponse;
    return {
      cards: data.cards.map((c) => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        imageUrl: c.imageUrl,
        minted: Number(c.minted),
        supplyCap: Number(c.supplyCap),
        ...(c.power !== undefined ? { power: c.power } : {}),
      })),
      total: data.total,
    };
  } catch {
    return { cards: [], total: 0 };
  }
}

// ─── Decorative icon ─────────────────────────────────────────────────────────

function CrystalIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="h-12 w-12 text-veil-400/50"
    >
      <path
        d="M24 4l8 12H16L24 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M16 16l8 28 8-28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path
        d="M4 22l12-6 16 28L4 22z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      <path
        d="M44 22L32 16 16 44l28-22z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
    </svg>
  );
}

// ─── JSON-LD structured data ──────────────────────────────────────────────────

const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${BASE_URL}/cards`,
  name: "Card Catalog | ShardVeil",
  description:
    "Browse all registered cards in the ShardVeil dark fantasy card game.",
  url: `${BASE_URL}/cards`,
  publisher: {
    "@type": "Organization",
    "@id": `${BASE_URL}/#org`,
    name: "ShardVeil",
  },
};

// ─── CardsPage ────────────────────────────────────────────────────────────────

export default async function CardsPage() {
  const { cards: initialCards, total: initialTotal } = await fetchFirstPage();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* ── Page header ── */}
      <header className="mb-10 text-center">
        {/* Decorative accent */}
        <div className="mb-5 flex items-center justify-center gap-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-veil-500/40" />
          <CrystalIcon />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-veil-500/40" />
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight text-content-primary sm:text-5xl">
          The Shards
        </h1>
        <p className="mt-3 font-body text-base text-content-secondary sm:text-lg">
          Browse all registered cards in the ShardVeil catalog.
        </p>

        {/* Decorative rule */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent to-stroke-emphasis" />
          <span className="font-display text-xs uppercase tracking-widest text-veil-400/50">
            ✦ Card Catalog ✦
          </span>
          <div className="h-px flex-1 max-w-xs bg-gradient-to-l from-transparent to-stroke-emphasis" />
        </div>
      </header>

      {/* ── Search + Filters ── */}
      <div className="mb-6 flex flex-col gap-3">
        <Suspense>
          <CardSearchInput />
        </Suspense>
        <Suspense>
          <CardFilters />
        </Suspense>
      </div>

      {/* ── Card Grid ── */}
      <Suspense
        fallback={
          <div
            aria-live="polite"
            aria-busy="true"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="overflow-hidden rounded-xl border border-stroke-base bg-surface-card"
              >
                <div className="aspect-[3/4] w-full motion-safe:animate-pulse bg-surface-elevated" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="h-3.5 w-2/3 rounded motion-safe:animate-pulse bg-surface-elevated" />
                  <div className="h-1.5 w-full rounded-full motion-safe:animate-pulse bg-surface-elevated" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <CardGrid initialCards={initialCards} initialTotal={initialTotal} />
      </Suspense>
    </div>
  );
}
