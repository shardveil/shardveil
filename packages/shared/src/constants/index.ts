import type { BattleRank, CardRarity, PackTier } from "../types/index";

/** Pack tier configurations (cost in SHARD wei, cards per pack, min rarity, daily limit) */
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
    cardCount: 3,
    minRarity: "COMMON",
    dailyLimit: 10,
  },
  PREMIUM: {
    costWei: 300n * 10n ** 18n,
    cardCount: 5,
    minRarity: "UNCOMMON",
    dailyLimit: 5,
  },
  ELITE: {
    costWei: 750n * 10n ** 18n,
    cardCount: 5,
    minRarity: "RARE",
    dailyLimit: 3,
  },
  MYTHIC: {
    costWei: 2000n * 10n ** 18n,
    cardCount: 5,
    minRarity: "EPIC",
    dailyLimit: 1,
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
