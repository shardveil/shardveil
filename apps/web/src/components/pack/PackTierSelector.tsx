"use client";

import type { PackTier } from "@shardveil/shared";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAccount } from "wagmi";

import { Skeleton } from "@/components/ui/Skeleton";
import { usePackContractRead } from "@/hooks/contracts/usePackContract";

import { PackTierCard } from "./PackTierCard";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PACK_TIERS_ORDERED: PackTier[] = ["BASIC", "PREMIUM", "ELITE", "MYTHIC"];

// ─── PackTierSelector Props ──────────────────────────────────────────────────

export interface PackTierSelectorProps {
  onSelectTier: (tier: PackTier) => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PackSelectorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Pity counter badge ───────────────────────────────────────────────────────

interface PityBadgeProps {
  label: string;
  count: number | undefined;
  isLoading: boolean;
}

function PityBadge({ label, count, isLoading }: PityBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stroke-default bg-surface-overlay px-4 py-2">
      <span className="text-xs text-content-secondary font-body">{label}</span>
      {isLoading ? (
        <Skeleton className="h-4 w-10" />
      ) : (
        <span className="text-sm font-semibold text-content-primary font-body">
          {count ?? "—"}
        </span>
      )}
    </div>
  );
}

// ─── PackTierSelector ─────────────────────────────────────────────────────────

export function PackTierSelector({ onSelectTier }: PackTierSelectorProps) {
  const { address, isConnected } = useAccount();

  // Pity counters (on-chain reads)
  const { data: rawEpicPity, isLoading: epicLoading } = usePackContractRead({
    functionName: "pityCounterEpic",
    ...(address ? { args: [address] as const } : {}),
    enabled: isConnected && !!address,
  });

  const { data: rawLegendaryPity, isLoading: legendaryLoading } =
    usePackContractRead({
      functionName: "pityCounterLegendary",
      ...(address ? { args: [address] as const } : {}),
      enabled: isConnected && !!address,
    });

  const epicPity =
    typeof rawEpicPity === "number"
      ? rawEpicPity
      : typeof rawEpicPity === "bigint"
        ? Number(rawEpicPity)
        : undefined;

  const legendaryPity =
    typeof rawLegendaryPity === "number"
      ? rawLegendaryPity
      : typeof rawLegendaryPity === "bigint"
        ? Number(rawLegendaryPity)
        : undefined;

  const pityLoading = epicLoading || legendaryLoading;

  // Show full skeleton only on first load (when address is present but pity hasn't resolved)
  const showSkeleton =
    isConnected &&
    !!address &&
    pityLoading &&
    epicPity === undefined &&
    legendaryPity === undefined;

  if (showSkeleton) {
    return <PackSelectorSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Tier grid */}
      <div
        className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4")}
      >
        {PACK_TIERS_ORDERED.map((tier) => (
          <PackTierCard key={tier} tier={tier} onSelect={onSelectTier} />
        ))}
      </div>

      {/* Pity indicators */}
      {isConnected && (
        <div className="flex flex-wrap gap-3">
          <PityBadge
            label="Packs since last Epic"
            count={epicPity}
            isLoading={epicLoading}
          />
          <PityBadge
            label="Packs since last Legendary"
            count={legendaryPity}
            isLoading={legendaryLoading}
          />
        </div>
      )}
    </div>
  );
}
