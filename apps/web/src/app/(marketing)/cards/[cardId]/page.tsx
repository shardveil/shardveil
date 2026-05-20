import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  type CardDetail,
  CardDetailView,
} from "@/components/cards/CardDetailView";

// ─── Revalidation ─────────────────────────────────────────────────────────────

export const revalidate = 300;

// ─── API ──────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchCard(cardId: string): Promise<CardDetail | null> {
  try {
    const res = await fetch(`${API_URL}/cards/${cardId}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return (await res.json()) as CardDetail;
  } catch {
    return null;
  }
}

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
  return {
    title: `${card.name} | ShardVeil Cards`,
    description: card.lore
      ? card.lore.slice(0, 155).replace(/\n/g, " ") + "…"
      : `View ${card.name}, a ${card.rarity.toLowerCase()} card in the ShardVeil universe.`,
    openGraph: {
      title: `${card.name} | ShardVeil Cards`,
      description: `${card.rarity} card — ${Number(card.minted).toLocaleString()} minted.`,
      ...(card.imageUrl ? { images: [card.imageUrl] } : {}),
      type: "website",
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

  return <CardDetailView card={card} />;
}
