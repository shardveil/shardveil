import Link from "next/link";

import { truncateAddress } from "@/lib/format";

import { RankCell } from "./RankCell";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CrafterEntry {
  rank: number;
  address: string;
  username?: string;
  avatarUrl?: string | null;
  legendaryCount: number;
  mythicCount: number;
  mostCraftedCard?: string; // card name
}

interface CraftersTableProps {
  crafters: CrafterEntry[];
}

// ─── CraftersTable ────────────────────────────────────────────────────────────

export function CraftersTable({ crafters }: CraftersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stroke-base">
      <table className="min-w-[600px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-elevated/80">
            {["Rank", "Crafter", "Legendary", "Mythic", "Best Craft"].map(
              (col) => (
                <th
                  key={col}
                  scope="col"
                  className={[
                    "px-4 py-3 text-left",
                    "font-display text-xs font-semibold tracking-widest uppercase",
                    "text-content-muted whitespace-nowrap",
                    col === "Rank" ? "w-16" : "",
                  ].join(" ")}
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {crafters.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center font-body text-sm text-content-muted italic"
              >
                No crafter data yet.
              </td>
            </tr>
          ) : (
            crafters.map((crafter, idx) => (
              <tr
                key={`${crafter.address}-${crafter.rank}`}
                className={[
                  "border-t border-stroke-base",
                  "motion-safe:transition-colors motion-safe:duration-150",
                  idx % 2 === 0 ? "bg-surface-card/40" : "bg-surface-card/20",
                  "hover:bg-surface-elevated/60",
                ].join(" ")}
              >
                {/* Rank */}
                <RankCell rank={crafter.rank} />

                {/* Crafter */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/profile/${crafter.address}`}
                    className="font-body font-medium text-content-primary hover:text-veil-400 motion-safe:transition-colors motion-safe:duration-150"
                    title={crafter.address}
                  >
                    {crafter.username ?? truncateAddress(crafter.address)}
                  </Link>
                </td>

                {/* Legendary */}
                <td className="px-4 py-3 whitespace-nowrap font-body tabular-nums text-yellow-400 font-semibold">
                  {crafter.legendaryCount.toLocaleString("en-US")}
                </td>

                {/* Mythic */}
                <td className="px-4 py-3 whitespace-nowrap font-body tabular-nums text-pink-400 font-semibold">
                  {crafter.mythicCount.toLocaleString("en-US")}
                </td>

                {/* Best Craft */}
                <td className="px-4 py-3 whitespace-nowrap font-body text-content-secondary">
                  {crafter.mostCraftedCard ?? "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
