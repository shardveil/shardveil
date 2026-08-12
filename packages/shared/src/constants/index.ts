import type { BattleRank, CardRarity, PackTier } from "../types/index";

/**
 * Pack tier configurations (cost in SHARD wei, cards per pack, min rarity, daily limit).
 *
 * These MUST mirror `packConfigs` in PackContract.initialize(). They are display
 * defaults only — `buyPack` burns the on-chain price, so an approval built from a
 * stale value here reverts. Anything spending money reads the chain first; see
 * apps/web/src/lib/packPurchase.ts.
 */
export const PACK_TIERS: Record<
  PackTier,
  {
    costWei: bigint;
    cardCount: number;
    minRarity: CardRarity;
    dailyLimit: number;
  }
> = {
  BASIC: {
    costWei: 100n * 10n ** 18n,
    cardCount: 5,
    minRarity: "UNCOMMON",
    dailyLimit: 20,
  },
  PREMIUM: {
    costWei: 500n * 10n ** 18n,
    cardCount: 6,
    minRarity: "RARE",
    dailyLimit: 10,
  },
  ELITE: {
    costWei: 2000n * 10n ** 18n,
    cardCount: 7,
    minRarity: "EPIC",
    dailyLimit: 5,
  },
  MYTHIC: {
    costWei: 10000n * 10n ** 18n,
    cardCount: 10,
    minRarity: "LEGENDARY",
    dailyLimit: 2,
  },
};

/** XP thresholds to reach each rank */
export const RANK_THRESHOLDS: Record<BattleRank, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 1500,
  PLATINUM: 3500,
  DIAMOND: 7500,
  APEX: 15000,
};

/** Crafting recipe definitions */
export const CRAFTING_RECIPES = [
  {
    id: "upgrade_common",
    inputs: ["COMMON", "COMMON", "COMMON"] as readonly CardRarity[],
    output: "UNCOMMON" as CardRarity,
    feeBps: 50,
  },
  {
    id: "upgrade_uncommon",
    inputs: ["UNCOMMON", "UNCOMMON", "UNCOMMON"] as readonly CardRarity[],
    output: "RARE" as CardRarity,
    feeBps: 75,
  },
  {
    id: "upgrade_rare",
    inputs: ["RARE", "RARE", "RARE"] as readonly CardRarity[],
    output: "EPIC" as CardRarity,
    feeBps: 100,
  },
  {
    id: "upgrade_epic",
    inputs: ["EPIC", "EPIC"] as readonly CardRarity[],
    output: "LEGENDARY" as CardRarity,
    feeBps: 150,
  },
] as const;

/** Tailwind CSS glow class per rarity for card borders/glows */
export const RARITY_COLORS: Record<CardRarity, string> = {
  COMMON: "border-gray-400 shadow-gray-400/40",
  UNCOMMON: "border-green-400 shadow-green-400/40",
  RARE: "border-shard-400 shadow-shard-400/40",
  EPIC: "border-veil-400 shadow-veil-400/40",
  LEGENDARY: "border-gold-400 shadow-gold-400/40",
  MYTHIC: "border-mythic-400 shadow-mythic-400/80",
};

/**
 * Public Arbitrum Sepolia RPCs used as fallbacks behind any configured endpoint.
 *
 * The official rollup endpoint rate-limits hard: throttling there is what made
 * /cards/[id] answer 404 for real cards, /health flag the indexer as lagging,
 * and browser reads of packConfigs fail with "Failed to fetch". All of these
 * send `access-control-allow-origin: *`, so they work from the browser too.
 *
 * A dedicated provider key still belongs in front of these — this only stops one
 * throttled host from taking a request down.
 */
export const ARBITRUM_SEPOLIA_RPC_FALLBACKS = [
  "https://arbitrum-sepolia.drpc.org",
  "https://arbitrum-sepolia-rpc.publicnode.com",
  "https://sepolia-rollup.arbitrum.io/rpc",
] as const;

/** Same idea for mainnet. */
export const ARBITRUM_RPC_FALLBACKS = [
  "https://arb1.arbitrum.io/rpc",
  "https://arbitrum.drpc.org",
  "https://arbitrum-one-rpc.publicnode.com",
] as const;
