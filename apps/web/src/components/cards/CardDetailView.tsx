import Image from "next/image";
import Link from "next/link";

import type { CardAbility, CardHolder, PricePoint } from "@/types/card";

import { CardHolders } from "./CardHolders";
import { CardLore } from "./CardLore";
import { CardPriceChart } from "./CardPriceChart";
import { CardStats } from "./CardStats";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardDetail {
  id: number;
  name: string;
  rarity: string;
  imageUrl: string | null;
  minted: string | number;
  supplyCap: string | number;
  power?: number;
  defense?: number;
  element?: string;
  lore?: string;
  abilities?: CardAbility[];
  priceHistory?: PricePoint[];
  topHolders?: CardHolder[];
}

// ─── Rarity helpers ───────────────────────────────────────────────────────────

type RarityKey =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

const RARITY_LABEL: Record<RarityKey, string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
  MYTHIC: "Mythic",
};

const RARITY_BADGE_CLASS: Record<RarityKey, string> = {
  COMMON: "bg-zinc-700 text-zinc-300 border-zinc-600",
  UNCOMMON: "bg-green-900/60 text-green-400 border-green-700",
  RARE: "bg-blue-900/60 text-blue-400 border-blue-700",
  EPIC: "bg-purple-900/60 text-purple-400 border-purple-700",
  LEGENDARY: "bg-yellow-900/60 text-yellow-400 border-yellow-700",
  MYTHIC: "bg-pink-900/60 text-pink-400 border-pink-700",
};

const RARITY_BAR_CLASS: Record<RarityKey, string> = {
  COMMON: "bg-zinc-400",
  UNCOMMON: "bg-green-500",
  RARE: "bg-blue-500",
  EPIC: "bg-purple-500",
  LEGENDARY: "bg-yellow-500",
  MYTHIC: "bg-pink-500",
};

const RARITY_GLOW_CLASS: Record<RarityKey, string> = {
  COMMON: "shadow-[0_0_30px_rgba(156,163,175,0.15)]",
  UNCOMMON: "shadow-[0_0_30px_rgba(34,197,94,0.15)]",
  RARE: "shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  EPIC: "shadow-[0_0_30px_rgba(168,85,247,0.15)]",
  LEGENDARY: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
  MYTHIC: "shadow-[0_0_30px_rgba(236,72,153,0.2)]",
};

function getRarityKey(rarity: string): RarityKey {
  const upper = rarity.toUpperCase();
  if (
    upper === "COMMON" ||
    upper === "UNCOMMON" ||
    upper === "RARE" ||
    upper === "EPIC" ||
    upper === "LEGENDARY" ||
    upper === "MYTHIC"
  ) {
    return upper;
  }
  return "COMMON";
}

// ─── CardDetailView ───────────────────────────────────────────────────────────

interface CardDetailViewProps {
  card: CardDetail;
}

export function CardDetailView({ card }: CardDetailViewProps) {
  const rarityKey = getRarityKey(card.rarity);
  const badgeClass = RARITY_BADGE_CLASS[rarityKey];
  const barClass = RARITY_BAR_CLASS[rarityKey];
  const glowClass = RARITY_GLOW_CLASS[rarityKey];
  const rarityLabel = RARITY_LABEL[rarityKey];

  const minted = Number(card.minted);
  const supplyCap = Number(card.supplyCap);
  const supplyPct =
    supplyCap > 0 ? Math.min(100, Math.round((minted / supplyCap) * 100)) : 0;

  return (
    <>
      {/* ── Main content ── */}
      <div className="mx-auto max-w-6xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 font-body text-sm text-content-muted">
            <li>
              <Link
                href="/cards"
                className="hover:text-content-primary motion-safe:transition-colors"
              >
                Cards
              </Link>
            </li>
            <li aria-hidden="true" className="text-stroke-emphasis">
              /
            </li>
            <li className="text-content-secondary" aria-current="page">
              {card.name}
            </li>
          </ol>
        </nav>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* ── Left: Art panel (~40%) ── */}
          <div className="lg:w-2/5">
            <div
              className={[
                "sticky top-24 overflow-hidden rounded-2xl border border-stroke-base bg-surface-card",
                glowClass,
              ].join(" ")}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-elevated">
                {card.imageUrl ? (
                  <Image
                    src={card.imageUrl}
                    alt={`${card.name} card art`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      viewBox="0 0 80 80"
                      fill="none"
                      aria-hidden="true"
                      className="h-20 w-20 text-content-muted opacity-20"
                    >
                      <rect
                        x="8"
                        y="8"
                        width="64"
                        height="64"
                        rx="8"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M8 56l20-20 12 12 16-20 16 28"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Info panel (~60%) ── */}
          <div className="flex flex-col gap-8 lg:w-3/5">
            {/* ── Section 1: Header ── */}
            <header className="space-y-4">
              {/* Rarity badge */}
              <span
                className={[
                  "inline-flex rounded-full border px-3 py-1",
                  "font-display text-xs font-semibold uppercase tracking-widest",
                  badgeClass,
                ].join(" ")}
              >
                {rarityLabel}
              </span>

              {/* Card name */}
              <h1 className="font-display text-3xl font-bold tracking-tight text-content-primary sm:text-4xl">
                {card.name}
              </h1>

              {/* Supply info + meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-body text-sm text-content-secondary">
                  <span>
                    <span className="font-semibold text-content-primary">
                      {minted.toLocaleString()}
                    </span>{" "}
                    minted
                  </span>
                  <span className="text-content-muted">
                    of {supplyCap.toLocaleString()} cap
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${minted} of ${supplyCap} minted`}
                  aria-valuenow={minted}
                  aria-valuemin={0}
                  aria-valuemax={supplyCap}
                  className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated"
                >
                  <div
                    className={["h-full rounded-full", barClass].join(" ")}
                    style={{ width: `${supplyPct}%` }}
                  />
                </div>
                <p className="font-body text-xs text-content-muted">
                  {supplyPct}% of supply minted
                </p>
              </div>
            </header>

            {/* ── Section 2: Stats ── */}
            <CardStats
              power={card.power}
              defense={card.defense}
              element={card.element}
              abilities={card.abilities}
            />

            {/* ── Section 3: Lore ── */}
            <CardLore lore={card.lore} />

            {/* ── Section 4: Price Chart ── */}
            <CardPriceChart
              priceHistory={card.priceHistory ?? []}
              cardId={card.id}
            />

            {/* ── Section 5: Top Holders ── */}
            <CardHolders holders={card.topHolders ?? []} />
          </div>
        </div>
      </div>

      {/* ── Sticky CTA bar (fixed bottom) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stroke-base bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <p className="font-body text-sm text-content-muted hidden sm:block">
            <span className="font-display font-semibold text-content-secondary">
              {card.name}
            </span>{" "}
            &mdash; {rarityLabel}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex items-center gap-2 rounded-lg border border-stroke-emphasis bg-veil-800 px-4 py-2 font-display text-sm font-semibold text-veil-400 opacity-50 cursor-not-allowed"
            >
              Open a Pack
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex items-center gap-2 rounded-lg border border-stroke-base bg-surface-elevated px-4 py-2 font-display text-sm font-semibold text-content-secondary opacity-50 cursor-not-allowed"
            >
              View Market
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
