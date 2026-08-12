"use client";

import type { PackTier } from "@shardveil/shared";
import { Package } from "lucide-react";

import { PackTierSelector } from "@/components/pack/PackTierSelector";
import { usePackPurchase } from "@/hooks/usePackPurchase";

// ─── PackPage ─────────────────────────────────────────────────────────────────

export default function PackPage() {
  const { buy, isPurchasing, error } = usePackPurchase();

  // Approves the on-chain price when needed, then buys. The VRF request id is
  // stored for the reveal; fulfillment arrives in a later block.
  function handleSelectTier(tier: PackTier) {
    void buy(tier);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-veil-400 shrink-0" />
          <h1 className="font-display text-2xl font-bold text-content-primary">
            Open Packs
          </h1>
        </div>
        <p className="text-content-secondary text-sm mt-1 font-body">
          Choose a pack tier to open and discover new cards for your collection.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-blood-600 bg-blood-950/60 px-4 py-3 text-sm font-body text-content-primary"
        >
          {error.message}
        </div>
      )}

      {isPurchasing && (
        <p className="text-sm font-body text-content-secondary" role="status">
          Confirm the transactions in your wallet…
        </p>
      )}

      {/* Tier selector (handles loading state + pity indicators internally) */}
      <PackTierSelector onSelectTier={handleSelectTier} />
    </div>
  );
}
