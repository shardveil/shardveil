"use client";

import type { PackTier } from "@shardveil/shared";
import { Package } from "lucide-react";

import { PackTierSelector } from "@/components/pack/PackTierSelector";
import { usePackStore } from "@/stores/packStore";

// ─── PackPage ─────────────────────────────────────────────────────────────────

export default function PackPage() {
  const setPackTier = usePackStore((s) => s.setPackTier);

  // Task 7.2 integration point:
  // When PackTierCard "Open Pack" is clicked, we store the selected tier
  // and log it. The actual purchase flow will be wired up in Task 7.2.
  function handleSelectTier(tier: PackTier) {
    setPackTier(tier);
    console.log("[PackPage] tier selected:", tier);
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

      {/* Tier selector (handles loading state + pity indicators internally) */}
      <PackTierSelector onSelectTier={handleSelectTier} />
    </div>
  );
}
