import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthState = {
  address: string | null;
  jwt: string | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
};

export type AuthActions = {
  setAuth: (address: string, jwt: string, expiresAt: number) => void;
  clearAuth: () => void;
};

export type AuthStore = AuthState & AuthActions;

// ─── Initial State ─────────────────────────────────────────────────────────────

const initialState: AuthState = {
  address: null,
  jwt: null,
  isAuthenticated: false,
  expiresAt: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setAuth: (address, jwt, expiresAt) =>
          set(
            { address, jwt, isAuthenticated: true, expiresAt },
            false,
            "setAuth",
          ),

        clearAuth: () =>
          set(
            {
              address: null,
              jwt: null,
              isAuthenticated: false,
              expiresAt: null,
            },
            false,
            "clearAuth",
          ),
      }),
      {
        name: "shardveil-auth",
        storage: createJSONStorage(() => localStorage),
        skipHydration: true,
      },
    ),
    { name: "AuthStore" },
  ),
);
