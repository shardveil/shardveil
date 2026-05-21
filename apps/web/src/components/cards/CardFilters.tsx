"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const RARITIES = [
  { value: "", label: "All" },
  { value: "COMMON", label: "Common" },
  { value: "UNCOMMON", label: "Uncommon" },
  { value: "RARE", label: "Rare" },
  { value: "EPIC", label: "Epic" },
  { value: "LEGENDARY", label: "Legendary" },
  { value: "MYTHIC", label: "Mythic" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most_minted", label: "Most Minted" },
  { value: "highest_power", label: "Highest Power" },
] as const;

const RARITY_CHIP_CLASS: Record<string, string> = {
  "": "border-stroke-emphasis bg-veil-800/40 text-content-primary",
  COMMON: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
  UNCOMMON: "border-green-700 bg-green-900/50 text-green-400",
  RARE: "border-blue-700 bg-blue-900/50 text-blue-400",
  EPIC: "border-purple-700 bg-purple-900/50 text-purple-400",
  LEGENDARY: "border-yellow-700 bg-yellow-900/50 text-yellow-400",
  MYTHIC: "border-pink-700 bg-pink-900/50 text-pink-400",
};

const RARITY_INACTIVE_CLASS: Record<string, string> = {
  "": "border-stroke-base text-content-muted hover:border-stroke-emphasis hover:text-content-secondary",
  COMMON:
    "border-zinc-700/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400",
  UNCOMMON:
    "border-green-900/40 text-green-700 hover:border-green-800 hover:text-green-500",
  RARE: "border-blue-900/40 text-blue-700 hover:border-blue-800 hover:text-blue-500",
  EPIC: "border-purple-900/40 text-purple-700 hover:border-purple-800 hover:text-purple-500",
  LEGENDARY:
    "border-yellow-900/40 text-yellow-700 hover:border-yellow-800 hover:text-yellow-500",
  MYTHIC:
    "border-pink-900/40 text-pink-700 hover:border-pink-800 hover:text-pink-500",
};

// ─── CardFilters ──────────────────────────────────────────────────────────────

export function CardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedRarities = searchParams.getAll("rarity");
  const currentSort = searchParams.get("sort") ?? "newest";

  const toggleRarity = useCallback(
    (value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("rarity");
        params.delete("page");
        if (value === "") {
          // "All" clears selection
        } else {
          const next = selectedRarities.includes(value)
            ? selectedRarities.filter((r) => r !== value)
            : [...selectedRarities, value];
          next.forEach((r) => params.append("rarity", r));
        }
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, selectedRarities],
  );

  const updateSort = useCallback(
    (value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("sort", value);
        } else {
          params.delete("sort");
        }
        params.delete("page");
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router],
  );

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-stroke-base bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Card catalog filters"
    >
      {/* ── Rarity chips ── */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by rarity"
      >
        {RARITIES.map(({ value, label }) => {
          const isActive =
            value === ""
              ? selectedRarities.length === 0
              : selectedRarities.includes(value);
          const activeClass = RARITY_CHIP_CLASS[value] ?? RARITY_CHIP_CLASS[""];
          const inactiveClass =
            RARITY_INACTIVE_CLASS[value] ?? RARITY_INACTIVE_CLASS[""];

          return (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={isActive}
              onClick={() => toggleRarity(value)}
              className={[
                "rounded-full border px-3 py-1",
                "font-display text-xs font-semibold uppercase tracking-wider",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
                isActive ? activeClass : inactiveClass,
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Sort select ── */}
      <div className="flex shrink-0 items-center gap-2">
        <label
          htmlFor="card-sort"
          className="font-body text-xs text-content-muted"
        >
          Sort by
        </label>
        <select
          id="card-sort"
          value={currentSort}
          onChange={(e) => updateSort(e.target.value)}
          className={[
            "rounded-lg border border-stroke-base bg-surface-card",
            "px-3 py-1.5 font-body text-sm text-content-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
            "cursor-pointer",
          ].join(" ")}
          aria-label="Sort cards by"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
