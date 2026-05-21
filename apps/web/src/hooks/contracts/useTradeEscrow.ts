"use client";

// STUB: tradeEscrow ABI not yet available. Will be implemented when contract is deployed.
// This file exports the same interface as other contract hooks for API consistency.

const abi = [] as const;

export function useTradeEscrowRead(_params: {
  functionName: string;
  args?: unknown;
  enabled?: boolean;
}) {
  return { data: undefined, isLoading: false, error: null };
}

export function useTradeEscrowWrite() {
  return {
    execute: async (_functionName: string, _args: unknown) => {
      throw new Error("TradeEscrow contract not yet deployed");
    },
    isPending: false,
    error: null,
  };
}

export function useTradeEscrowEvents(_params: {
  eventName: string;
  onLogs: (logs: unknown[]) => void;
  enabled?: boolean;
}) {
  // No-op stub
}

export const TradeEscrowAbi = abi;
