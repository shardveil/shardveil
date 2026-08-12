import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  type CardDetail,
  CardDetailView,
} from "@/components/cards/CardDetailView";
import {
  cardDisplayName,
  cardImageUrl,
  cardTypeLabel,
  rarityName,
} from "@/lib/cardDisplay";

// ─── Revalidation ─────────────────────────────────────────────────────────────

export const revalidate = 300;

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shardveil.xyz";

// ─── API ──────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Data fetching ────────────────────────────────────────────────────────────

/** Raw shape the API actually returns — on-chain values, not display values. */
interface CardDetailApiResponse {
  cardId: number;
  rarity: number;
  name: string | null;
  minted: string;
  supplyCap: string;
  atkBase: number;
  defBase: number;
  spdBase: number;
  hpBase: number;
  cardType: number;
}

const fetchCard = cache(async (cardId: string): Promise<CardDetail | null> => {
  try {
    const res = await fetch(`${API_URL}/cards/${cardId}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = (await res.json()) as CardDetailApiResponse;

    // Map rather than cast. The API sends a numeric rarity, a null name and no
    // image; casting straight to CardDetail made rarity.toLowerCase() throw and
    // returned a 500 for every card.
    return {
      id: data.cardId,
      name: cardDisplayName(data.name, data.cardId),
      rarity: rarityName(data.rarity),
      imageUrl: cardImageUrl(null),
      minted: data.minted,
      supplyCap: data.supplyCap,
      power: data.atkBase,
      defense: data.defBase,
      speed: data.spdBase,
      health: data.hpBase,
      element: cardTypeLabel(data.cardType),
    };
  } catch {
    return null;
  }
});

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ cardId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { cardId } = await params;
  const card = await fetchCard(cardId);
  if (!card) {
    return { title: "Card Not Found | ShardVeil" };
  }
  const ogImage = `${BASE_URL}/api/og/card/${cardId}`;
  return {
    title: `${card.name} | ShardVeil Cards`,
    description: card.lore
      ? card.lore.slice(0, 155).replace(/\n/g, " ") + "…"
      : `View ${card.name}, a ${card.rarity.toLowerCase()} card in the ShardVeil universe.`,
    alternates: {
      canonical: `${BASE_URL}/cards/${cardId}`,
    },
    openGraph: {
      title: `${card.name} | ShardVeil Cards`,
      description: `${card.rarity} card — ${Number(card.minted).toLocaleString()} minted.`,
      images: [ogImage],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  };
}

// ─── CardDetailPage ───────────────────────────────────────────────────────────

export default async function CardDetailPage({ params }: PageProps) {
  const { cardId } = await params;
  const card = await fetchCard(cardId);

  if (!card) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: card.name,
    description: card.lore
      ? card.lore.slice(0, 155).replace(/\n/g, " ") + "…"
      : `${card.rarity} card in the ShardVeil universe.`,
    image: card.imageUrl ?? `${BASE_URL}/api/og/card/${cardId}`,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "ETH",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CardDetailView card={card} />
    </>
  );
}
