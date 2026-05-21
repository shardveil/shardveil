import Link from "next/link";

import { truncateAddress } from "@/lib/format";

import { RankCell } from "./RankCell";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankedPlayer {
  rank: number;
  address: string;
  username?: string;
  avatarUrl?: string | null;
  battleRank: string; // BRONZE|SILVER|GOLD|PLATINUM|DIAMOND|APEX
  seasonExp: number;
  winRate: number; // 0–100
}

interface RankedTableProps {
  players: RankedPlayer[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExp(exp: number): string {
  return exp.toLocaleString("en-US");
}

// ─── BattleRankBadge ──────────────────────────────────────────────────────────

const BATTLE_RANK_COLORS: Record<string, string> = {
  BRONZE: "bg-amber-900/40 border-amber-700/50 text-amber-700",
  SILVER: "bg-zinc-800/60 border-zinc-600/50 text-zinc-400",
  GOLD: "bg-yellow-900/30 border-yellow-600/50 text-yellow-400",
  PLATINUM: "bg-cyan-900/30 border-cyan-600/50 text-cyan-400",
  DIAMOND: "bg-blue-900/30 border-blue-600/50 text-blue-400",
  APEX: "bg-purple-900/30 border-purple-600/50 text-purple-400",
};

function BattleRankBadge({ battleRank }: { battleRank: string }) {
  const colorClass =
    BATTLE_RANK_COLORS[battleRank] ??
    "bg-surface-card border-stroke-base text-content-muted";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "font-display text-xs font-semibold uppercase tracking-wider",
        colorClass,
      ].join(" ")}
    >
      {battleRank.charAt(0) + battleRank.slice(1).toLowerCase()}
    </span>
  );
}

// ─── WinRateBar ───────────────────────────────────────────────────────────────

function WinRateBar({ winRate }: { winRate: number }) {
  const clamped = Math.min(100, Math.max(0, winRate));
  const barColor =
    clamped >= 70
      ? "bg-green-500"
      : clamped >= 50
        ? "bg-yellow-400"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <span className="font-body text-sm text-content-secondary tabular-nums">
        {clamped}%
      </span>
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-elevated"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full motion-safe:transition-all motion-safe:duration-500 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ─── RankedTable ──────────────────────────────────────────────────────────────

export function RankedTable({ players }: RankedTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stroke-base">
      <table className="min-w-[600px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-elevated/80">
            {["Rank", "Player", "Battle Rank", "EXP", "Win Rate"].map((col) => (
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
            ))}
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center font-body text-sm text-content-muted italic"
              >
                No ranked players yet. Be the first to battle!
              </td>
            </tr>
          ) : (
            players.map((player, idx) => (
              <tr
                key={`${player.address}-${player.rank}`}
                className={[
                  "border-t border-stroke-base",
                  "motion-safe:transition-colors motion-safe:duration-150",
                  idx % 2 === 0 ? "bg-surface-card/40" : "bg-surface-card/20",
                  "hover:bg-surface-elevated/60",
                ].join(" ")}
              >
                {/* Rank */}
                <RankCell rank={player.rank} />

                {/* Player */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    href={`/profile/${player.address}`}
                    className="font-body font-medium text-content-primary hover:text-veil-400 motion-safe:transition-colors motion-safe:duration-150"
                    title={player.address}
                  >
                    {player.username ?? truncateAddress(player.address)}
                  </Link>
                </td>

                {/* Battle Rank */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <BattleRankBadge battleRank={player.battleRank} />
                </td>

                {/* EXP */}
                <td className="px-4 py-3 whitespace-nowrap font-body tabular-nums text-content-secondary">
                  {formatExp(player.seasonExp)}
                </td>

                {/* Win Rate */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <WinRateBar winRate={player.winRate} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
