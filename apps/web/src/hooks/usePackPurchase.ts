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
import { waitForPackFulfillment } from "@/lib/packReveal";
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
  const setRevealing = usePackStore((s) => s.setRevealing);
  const setRevealedCardIds = usePackStore((s) => s.setRevealedCardIds);

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
        // VRF fulfillment lands in a later block; the reveal polls for this id.
        setPendingRequest(result.requestId.toString());
        setRevealing(true);

        try {
          const reveal = await waitForPackFulfillment({
            publicClient,
            packContract: deployment!.packContract,
            cardNft: deployment!.cardNFT,
            buyer: address,
            requestId: result.requestId,
            fromBlock: result.blockNumber,
          });

          setRevealedCardIds(reveal.cardIds);
        } catch (revealError) {
          // The SHARD is already burned and the cards are already minted on
          // chain — a reveal timeout is a display failure, not a lost pack.
          setError(toPurchaseError(revealError));
        } finally {
          setRevealing(false);
          setPendingRequest(null);
        }

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
      setRevealing,
      setRevealedCardIds,
    ],
  );

  return { buy, isPurchasing, error, isReady: Boolean(address && deployment) };
}
