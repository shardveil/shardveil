"use client";

// STUB: profileRegistry ABI not yet available. Will be implemented when contract is deployed.
// This file exports the same interface as other contract hooks for API consistency.

const abi = [] as const;

export function useProfileRegistryRead(_params: {
  functionName: string;
  args?: unknown;
  enabled?: boolean;
}) {
  return { data: undefined, isLoading: false, error: null };
}

export function useProfileRegistryWrite() {
  return {
    execute: async (_functionName: string, _args: unknown) => {
      throw new Error("ProfileRegistry contract not yet deployed");
    },
    isPending: false,
    error: null,
  };
}

export function useProfileRegistryEvents(_params: {
  eventName: string;
  onLogs: (logs: unknown[]) => void;
  enabled?: boolean;
}) {
  // No-op stub
}

export const ProfileRegistryAbi = abi;
