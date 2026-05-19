import type { CardRarity, CardResult, PackTier } from "@shardveil/shared";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { CardRarity, PackTier };

/**
 * Per-rarity pity counter: tracks how many packs have been opened
 * since the last card of that rarity was pulled.
 */
export type PityCounters = Partial<Record<CardRarity, number>>;

export type PackState = {
  /** The pending on-chain VRF request ID (stringified bigint) */
  pendingRequestId: string | null;
  /** Cards revealed after a pack open animation */
  revealedCards: CardResult[];
  isRevealing: boolean;
  currentPackTier: PackTier | null;
  pityCounters: PityCounters;
};

export type PackActions = {
  setPendingRequest: (requestId: string | null) => void;
  setRevealing: (revealing: boolean) => void;
  setRevealedCards: (cards: CardResult[]) => void;
  setPackTier: (tier: PackTier | null) => void;
  incrementPity: (rarity: CardRarity) => void;
  resetPity: (rarity: CardRarity) => void;
  resetPack: () => void;
};

export type PackStore = PackState & PackActions;

// ─── Initial State ─────────────────────────────────────────────────────────────

const initialState: PackState = {
  pendingRequestId: null,
  revealedCards: [],
  isRevealing: false,
  currentPackTier: null,
  pityCounters: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePackStore = create<PackStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setPendingRequest: (requestId) =>
        set(
          (state) => {
            state.pendingRequestId = requestId;
          },
          false,
          "setPendingRequest",
        ),

      setRevealing: (revealing) =>
        set(
          (state) => {
            state.isRevealing = revealing;
          },
          false,
          "setRevealing",
        ),

      setRevealedCards: (cards) =>
        set(
          (state) => {
            state.revealedCards = cards;
          },
          false,
          "setRevealedCards",
        ),

      setPackTier: (tier) =>
        set(
          (state) => {
            state.currentPackTier = tier;
          },
          false,
          "setPackTier",
        ),

      incrementPity: (rarity) =>
        set(
          (state) => {
            state.pityCounters[rarity] = (state.pityCounters[rarity] ?? 0) + 1;
          },
          false,
          "incrementPity",
        ),

      resetPity: (rarity) =>
        set(
          (state) => {
            state.pityCounters[rarity] = 0;
          },
          false,
          "resetPity",
        ),

      resetPack: () =>
        set(
          (state) => {
            state.pendingRequestId = null;
            state.revealedCards = [];
            state.isRevealing = false;
            state.currentPackTier = null;
          },
          false,
          "resetPack",
        ),
    })),
    { name: "PackStore" },
  ),
);
