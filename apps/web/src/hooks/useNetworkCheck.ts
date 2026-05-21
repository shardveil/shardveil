"use client";

import { useChainId, useSwitchChain } from "wagmi";

import { defaultChain } from "@/lib/chains";

export interface UseNetworkCheckReturn {
  isCorrectChain: boolean;
  expectedChain: typeof defaultChain;
  currentChainId: number;
  switchToCorrect: () => void;
  isSwitching: boolean;
  switchError: Error | null;
}

/**
 * Hook to check if the user is connected to the correct chain and provide
 * functionality to switch to it.
 *
 * @returns {UseNetworkCheckReturn} Network status and switch functionality
 */
export function useNetworkCheck(): UseNetworkCheckReturn {
  const currentChainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();

  const isCorrectChain = currentChainId === defaultChain.id;

  const switchToCorrect = () => {
    switchChain({ chainId: defaultChain.id });
  };

  return {
    isCorrectChain,
    expectedChain: defaultChain,
    currentChainId,
    switchToCorrect,
    isSwitching: isPending,
    switchError: error || null,
  };
}
