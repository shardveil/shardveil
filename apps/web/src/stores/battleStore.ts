import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BattleMatchState = "idle" | "matching" | "active" | "ended";
export type BattlePhase = "draw" | "action" | "resolve" | null;

export type BattleUiState = {
  activeMatchId: string | null;
  state: BattleMatchState;
  phase: BattlePhase;
  /** Unix timestamp (ms) when the current turn expires */
  turnDeadline: number | null;
  opponentDisconnected: boolean;
  /** Number of on-chain commit signatures collected for match result */
  signaturesCollected: number;
};

export type BattleActions = {
  setMatch: (matchId: string) => void;
  setState: (state: BattleMatchState) => void;
  setPhase: (phase: BattlePhase) => void;
  setTurnDeadline: (deadline: number | null) => void;
  setOpponentDisconnected: (disconnected: boolean) => void;
  setSignaturesCollected: (count: number) => void;
  resetMatch: () => void;
};

export type BattleStore = BattleUiState & BattleActions;

// ─── Initial State ─────────────────────────────────────────────────────────────

const initialState: BattleUiState = {
  activeMatchId: null,
  state: "idle",
  phase: null,
  turnDeadline: null,
  opponentDisconnected: false,
  signaturesCollected: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBattleStore = create<BattleStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setMatch: (matchId) =>
        set({ activeMatchId: matchId, state: "matching" }, false, "setMatch"),

      setState: (state) => set({ state }, false, "setState"),

      setPhase: (phase) => set({ phase }, false, "setPhase"),

      setTurnDeadline: (deadline) =>
        set({ turnDeadline: deadline }, false, "setTurnDeadline"),

      setOpponentDisconnected: (disconnected) =>
        set(
          { opponentDisconnected: disconnected },
          false,
          "setOpponentDisconnected",
        ),

      setSignaturesCollected: (count) =>
        set({ signaturesCollected: count }, false, "setSignaturesCollected"),

      /** Full reset when the player exits a match */
      resetMatch: () => set(initialState, false, "resetMatch"),
    }),
    { name: "BattleStore" },
  ),
);
