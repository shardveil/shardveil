"use client";

import type { CardRarity, PackTier } from "@shardveil/shared";
import { PACK_TIERS, RARITY_COLORS } from "@shardveil/shared";
import { clsx } from "clsx";
import { motion } from "motion/react";
import { twMerge } from "tailwind-merge";

import { Button } from "@/components/ui/Button";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// ─── Rarity glow map ─────────────────────────────────────────────────────────

/**
 * Maps a CardRarity to Tailwind hover-glow classes for the tier card.
 * RARITY_COLORS values are border+shadow classes; we adapt them for hover.
 */
const RARITY_HOVER_GLOW: Record<CardRarity, string> = {
  COMMON:
    "hover:border-gray-400 hover:shadow-[0_0_24px_rgba(156,163,175,0.35)]",
  UNCOMMON:
    "hover:border-green-400 hover:shadow-[0_0_24px_rgba(74,222,128,0.35)]",
  RARE: "hover:border-blue-400 hover:shadow-[0_0_24px_rgba(96,165,250,0.40)]",
  EPIC: "hover:border-purple-400 hover:shadow-[0_0_28px_rgba(155,95,250,0.45)]",
  LEGENDARY:
    "hover:border-yellow-400 hover:shadow-[0_0_32px_rgba(251,191,36,0.50)]",
  MYTHIC:
    "hover:border-pink-400 hover:shadow-[0_0_40px_rgba(232,121,249,0.60)]",
};

/**
 * Accent colour classes used for the tier name text and decorative dot.
 */
const RARITY_ACCENT_TEXT: Record<CardRarity, string> = {
  COMMON: "text-gray-300",
  UNCOMMON: "text-green-400",
  RARE: "text-blue-400",
  EPIC: "text-purple-400",
  LEGENDARY: "text-yellow-400",
  MYTHIC: "text-pink-400",
};

const RARITY_DOT_BG: Record<CardRarity, string> = {
  COMMON: "bg-gray-400",
  UNCOMMON: "bg-green-400",
  RARE: "bg-blue-400",
  EPIC: "bg-purple-400",
  LEGENDARY: "bg-yellow-400",
  MYTHIC: "bg-pink-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCostWei(costWei: bigint): string {
  // costWei / 10^18 with up to 2 decimal places, trimming trailing zeros
  const whole = costWei / 10n ** 18n;
  const remainder = costWei % 10n ** 18n;
  if (remainder === 0n) return whole.toString();
  const decimals = remainder.toString().padStart(18, "0").slice(0, 2);
  return `${whole}.${decimals}`.replace(/\.?0+$/, "");
}

function formatRarity(rarity: CardRarity): string {
  return rarity.charAt(0) + rarity.slice(1).toLowerCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PackTierCardProps {
  tier: PackTier;
  onSelect: (tier: PackTier) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PackTierCard({ tier, onSelect }: PackTierCardProps) {
  const config = PACK_TIERS[tier];
  const { costWei, cardCount, minRarity, dailyLimit } = config;

  // Use minRarity to drive the visual theme
  const rarityKey = minRarity as CardRarity;
  const hoverGlow = RARITY_HOVER_GLOW[rarityKey];
  const accentText = RARITY_ACCENT_TEXT[rarityKey];
  const dotBg = RARITY_DOT_BG[rarityKey];

  // Suppress unused import warning — RARITY_COLORS is part of the spec
  void RARITY_COLORS;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className={cn(
        "relative flex flex-col rounded-xl border border-stroke-default",
        "bg-surface-card p-5 cursor-pointer select-none",
        "transition-shadow duration-300",
        hoverGlow,
      )}
    >
      {/* Tier name */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotBg)} />
        <h2
          className={cn(
            "font-display text-lg font-bold tracking-wide uppercase",
            accentText,
          )}
        >
          {tier}
        </h2>
      </div>

      {/* Stats list */}
      <dl className="flex-1 space-y-2 mb-5">
        <div className="flex items-center justify-between">
          <dt className="text-xs text-content-secondary font-body">Cost</dt>
          <dd className="text-sm font-semibold text-content-primary font-body">
            {formatCostWei(costWei)}{" "}
            <span className="text-xs text-content-secondary">SHARD</span>
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-xs text-content-secondary font-body">Cards</dt>
          <dd className="text-sm font-semibold text-content-primary font-body">
            {cardCount}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-xs text-content-secondary font-body">
            Min. Rarity
          </dt>
          <dd
            className={cn(
              "text-xs font-semibold font-body px-2 py-0.5 rounded-full",
              "border",
              // Inline style approximation; leverages the accent text class
              accentText,
            )}
          >
            {formatRarity(minRarity)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-xs text-content-secondary font-body">
            Daily Limit
          </dt>
          <dd className="text-sm font-semibold text-content-primary font-body">
            {dailyLimit}×
          </dd>
        </div>
      </dl>

      {/* CTA */}
      <Button
        intent="primary"
        size="md"
        className="w-full"
        onClick={() => onSelect(tier)}
      >
        Open Pack
      </Button>
    </motion.div>
  );
}
