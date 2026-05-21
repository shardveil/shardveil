import * as React from "react";

// ─── StatsGrid ────────────────────────────────────────────────────────────────

interface Stats {
  battlesWon: number;
  battlesLost: number;
  winRate: number;
  currentRank: string;
  seasonExp: number;
  cardsOwned: number;
  guildName?: string;
}

interface StatsGridProps {
  stats?: Stats;
}

// ─── Rank badge mapping ────────────────────────────────────────────────────────

type RankKey = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | "APEX";

const RANK_BADGE_CLASS: Record<RankKey, string> = {
  BRONZE: "border-amber-700 bg-amber-900/40 text-amber-500",
  SILVER: "border-zinc-500 bg-zinc-800/40 text-zinc-300",
  GOLD: "border-yellow-600 bg-yellow-900/40 text-yellow-400",
  PLATINUM: "border-cyan-600 bg-cyan-900/40 text-cyan-400",
  DIAMOND: "border-blue-600 bg-blue-900/40 text-blue-400",
  APEX: "border-purple-600 bg-purple-900/40 text-purple-400",
};

function getRankBadgeClass(rank: string): string {
  const upper = rank.toUpperCase() as RankKey;
  return (
    RANK_BADGE_CLASS[upper] ??
    "border-stroke-base bg-surface-elevated text-content-primary"
  );
}

function getRankLabel(rank: string): string {
  return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueClass,
  children,
}: {
  label: string;
  value?: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-surface-elevated rounded-xl p-4 border border-stroke-base motion-safe:transition-colors motion-safe:duration-150">
      <p className="font-body text-xs text-content-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      {children ?? (
        <p
          className={[
            "font-display text-xl",
            valueClass ?? "text-content-primary",
          ].join(" ")}
        >
          {value}
        </p>
      )}
    </div>
  );
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────

export function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) {
    return (
      <p className="font-body text-sm text-content-muted">
        No stats available.
      </p>
    );
  }

  const rankLabel = getRankLabel(stats.currentRank);
  const rankBadgeClass = getRankBadgeClass(stats.currentRank);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard
        label="Battles Won"
        value={stats.battlesWon.toLocaleString()}
        valueClass="text-green-400"
      />
      <StatCard
        label="Battles Lost"
        value={stats.battlesLost.toLocaleString()}
        valueClass="text-red-400"
      />
      <StatCard
        label="Win Rate"
        value={`${stats.winRate}%`}
        valueClass="text-veil-400"
      />
      <StatCard label="Current Rank">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide border ${rankBadgeClass}`}
        >
          {rankLabel}
        </span>
      </StatCard>
      <StatCard label="Season EXP" value={stats.seasonExp.toLocaleString()} />
      <StatCard label="Cards Owned" value={String(stats.cardsOwned)} />
      <StatCard label="Guild" value={stats.guildName ?? "—"} />
    </div>
  );
}
