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

// ─── Rank colour mapping ───────────────────────────────────────────────────────

type RankKey = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND" | "APEX";

const RANK_COLOR: Record<RankKey, string> = {
  BRONZE: "text-amber-700",
  SILVER: "text-zinc-400",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-400",
  DIAMOND: "text-blue-400",
  APEX: "text-purple-400",
};

function getRankColor(rank: string): string {
  const upper = rank.toUpperCase() as RankKey;
  return RANK_COLOR[upper] ?? "text-content-primary";
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface-elevated rounded-xl p-4 border border-stroke-base">
      <p className="font-body text-xs text-content-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={[
          "font-display text-xl",
          valueClass ?? "text-content-primary",
        ].join(" ")}
      >
        {value}
      </p>
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
      <StatCard
        label="Current Rank"
        value={
          stats.currentRank.charAt(0).toUpperCase() +
          stats.currentRank.slice(1).toLowerCase()
        }
        valueClass={getRankColor(stats.currentRank)}
      />
      <StatCard label="Season EXP" value={stats.seasonExp.toLocaleString()} />
      <StatCard label="Cards Owned" value={String(stats.cardsOwned)} />
      <StatCard label="Guild" value={stats.guildName ?? "—"} />
    </div>
  );
}
