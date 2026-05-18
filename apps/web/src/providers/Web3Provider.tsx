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
export function Web3Provider({ children, cookies }: Web3ProviderProps) {
  const initialState = cookieToInitialState(wagmiConfig, cookies);

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      {children}
    </WagmiProvider>
  );
}
