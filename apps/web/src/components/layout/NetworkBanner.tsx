"use client";

import { AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useNetworkCheck } from "@/hooks/useNetworkCheck";

/**
 * NetworkBanner — alerts user when connected to wrong chain and provides switch functionality
 *
 * Shows when:
 * - User is connected to a wallet AND
 * - Connected to wrong chain
 *
 * Hides when:
 * - Correct chain is connected, OR
 * - No wallet is connected
 */
export function NetworkBanner() {
  const { isConnected } = useAccount();
  const {
    isCorrectChain,
    expectedChain,
    currentChainId,
    switchToCorrect,
    isSwitching,
    switchError,
  } = useNetworkCheck();

  // Hide banner if not connected or on correct chain
  if (!isConnected || isCorrectChain) {
    return null;
  }

  // Determine current chain name
  const currentChainName =
    currentChainId === 42161 ? "Arbitrum" : "Arbitrum Sepolia";

  // Check if switch is not supported
  const switchNotSupported = switchError?.message
    ?.toLowerCase()
    .includes("unsupported");

  return (
    <div
      role="alert"
      className="fixed top-16 left-0 right-0 z-40 border-b border-gold-700 bg-gold-900/95 backdrop-blur-sm px-4 py-2 md:py-3"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: warning icon + message */}
        <div className="flex items-start md:items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-gold-300 shrink-0 mt-0.5 md:mt-0" />
          <div className="flex-1">
            <p className="text-sm font-body text-content-primary">
              You're on{" "}
              <span className="font-semibold">{currentChainName}</span>
              {". ShardVeil runs on "}
              <span className="font-semibold">{expectedChain.name}</span>.
            </p>
            {switchNotSupported && (
              <p className="text-xs font-body text-content-muted mt-1">
                Please switch to {expectedChain.name} manually in your wallet.
              </p>
            )}
          </div>
        </div>

        {/* Right: switch button or fallback message */}
        {!switchNotSupported && (
          <Button
            onClick={switchToCorrect}
            disabled={isSwitching}
            className="bg-gold-700 hover:bg-gold-600 text-white shrink-0 w-full md:w-auto"
            size="sm"
          >
            {isSwitching ? (
              <>
                <Spinner size="sm" />
                <span>Switching...</span>
              </>
            ) : (
              "Switch Network"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to get the height of the NetworkBanner when visible
 * Used to compensate body padding when banner is shown
 *
 * @returns {number} Height in pixels (40 when shown, 0 when hidden)
 */
export function useNetworkBannerHeight(): number {
  const { isConnected } = useAccount();
  const { isCorrectChain } = useNetworkCheck();

  // Return 40px when banner is visible, 0 otherwise
  return isConnected && !isCorrectChain ? 40 : 0;
}
