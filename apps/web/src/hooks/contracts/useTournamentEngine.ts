"use client";

// STUB: tournamentEngine ABI not yet available. Will be implemented when contract is deployed.
// This file exports the same interface as other contract hooks for API consistency.

const abi = [] as const;

export function useTournamentEngineRead(_params: {
  functionName: string;
  args?: unknown;
  enabled?: boolean;
}) {
  return { data: undefined, isLoading: false, error: null };
}

export function useTournamentEngineWrite() {
  return {
    execute: async (_functionName: string, _args: unknown) => {
      throw new Error("TournamentEngine contract not yet deployed");
    },
    isPending: false,
    error: null,
  };
}

export function useTournamentEngineEvents(_params: {
  eventName: string;
  onLogs: (logs: unknown[]) => void;
  enabled?: boolean;
}) {
  // No-op stub
}

export const TournamentEngineAbi = abi;
