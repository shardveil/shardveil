import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerCacheEntry = {
  username: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

/**
 * In-memory cache keyed by Ethereum address (lowercase).
 * Populated lazily on hover / visible row without a dedicated fetch store.
 */
export type PlayerState = {
  cache: Record<string, PlayerCacheEntry>;
};

export type PlayerActions = {
  setPlayer: (address: string, entry: PlayerCacheEntry) => void;
  updatePlayer: (address: string, partial: Partial<PlayerCacheEntry>) => void;
  removePlayer: (address: string) => void;
  clearCache: () => void;
  getPlayer: (address: string) => PlayerCacheEntry | undefined;
};

export type PlayerStore = PlayerState & PlayerActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePlayerStore = create<PlayerStore>()(
  devtools(
    immer((set, get) => ({
      cache: {},

      setPlayer: (address, entry) =>
        set(
          (state) => {
            state.cache[address.toLowerCase()] = entry;
          },
          false,
          "setPlayer",
        ),

      updatePlayer: (address, partial) =>
        set(
          (state) => {
            const key = address.toLowerCase();
            const existing = state.cache[key];
            if (existing) {
              Object.assign(existing, partial);
            }
          },
          false,
          "updatePlayer",
        ),

      removePlayer: (address) =>
        set(
          (state) => {
            delete state.cache[address.toLowerCase()];
          },
          false,
          "removePlayer",
        ),

      clearCache: () =>
        set(
          (state) => {
            state.cache = {};
          },
          false,
          "clearCache",
        ),

      getPlayer: (address) => get().cache[address.toLowerCase()],
    })),
    { name: "PlayerStore" },
  ),
);
