// Note: WagmiProvider requires QueryClientProvider above it in the tree.
// QueryClientProvider is added in Task 5.4 (QueryProvider) and composed in AppProvider (Task 5.13).
"use client";

import { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

interface Web3ProviderProps {
  children: ReactNode;
  cookies: string | null;
}

/**
 * Web3Provider wraps WagmiProvider with SSR-safe cookie hydration.
 * Reads the wagmi connection state from cookies set on the server so
 * the client hydrates with the correct wallet state, preventing mismatches.
 *
 * Note: RainbowKit is intentionally excluded — a custom connect modal
 * is provided in Task 5.7.
 */
// Wired into the root layout via AppProvider (see apps/web/src/providers/AppProvider.tsx — Task 5.13)
export function Web3Provider({ children, cookies }: Web3ProviderProps) {
  const initialState = cookieToInitialState(wagmiConfig, cookies);

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      {children}
    </WagmiProvider>
  );
}
