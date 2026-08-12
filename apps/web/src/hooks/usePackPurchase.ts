"use client";

import { addresses, ARBITRUM_SEPOLIA_CHAIN_ID } from "@shardveil/contracts";
import type { PackTier } from "@shardveil/shared";
import { useCallback, useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";

import {
  PackPurchaseError,
  purchasePack,
  toPurchaseError,
} from "@/lib/packPurchase";
import { usePackStore } from "@/stores/packStore";

/**
 * React binding for the pack purchase flow.
 *
 * All the on-chain sequencing lives in lib/packPurchase.ts, which is covered by
 * tests. This hook only owns React state and wiring.
 */
export function usePackPurchase() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const setPendingRequest = usePackStore((s) => s.setPendingRequest);
  const setPackTier = usePackStore((s) => s.setPackTier);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<PackPurchaseError | null>(null);

  const deployment =
    chainId === ARBITRUM_SEPOLIA_CHAIN_ID
      ? addresses[ARBITRUM_SEPOLIA_CHAIN_ID]
      : undefined;

  const buy = useCallback(
    async (tier: PackTier) => {
      if (!address || !publicClient || !walletClient) {
        setError(
          new PackPurchaseError(
            "NO_CONTRACT",
            "Connect a wallet to open packs.",
          ),
        );
        return null;
      }

      setIsPurchasing(true);
      setError(null);

      try {
        const result = await purchasePack({
          publicClient,
          walletClient,
          account: address,
          packContract: deployment?.packContract,
          shardToken: deployment?.shardToken,
          tier,
        });

        setPackTier(tier);
        // VRF fulfillment lands in a later block; the reveal watches this id.
        setPendingRequest(result.requestId.toString());
        return result;
      } catch (caught) {
        setError(toPurchaseError(caught));
        return null;
      } finally {
        setIsPurchasing(false);
      }
    },
    [
      address,
      publicClient,
      walletClient,
      deployment,
      setPackTier,
      setPendingRequest,
    ],
  );

  return { buy, isPurchasing, error, isReady: Boolean(address && deployment) };
}
