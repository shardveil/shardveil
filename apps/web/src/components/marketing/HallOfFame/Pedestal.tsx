import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PedestalProps {
  rank: 1 | 2 | 3;
  category: string;
  playerName: string;
  playerAddress: string;
  statValue: string;
  isEmpty?: boolean;
}

// ─── Rank config ──────────────────────────────────────────────────────────────

const RANK_CONFIG = {
  1: {
    label: "I",
    borderClass: "border-gold-400",
    badgeBg: "bg-gold-500/20",
    badgeText: "text-gold-300",
    badgeBorder: "border-gold-500/50",
    glowClass: "shadow-[0_0_32px_rgba(245,158,11,0.25)]",
    heightClass: "pt-10",
    rankLabel: "1st",
    rankColor: "text-gold-300",
  },
  2: {
    label: "II",
    borderClass: "border-[#a1a1aa]",
    badgeBg: "bg-[#a1a1aa]/10",
    badgeText: "text-[#d4d4d8]",
    badgeBorder: "border-[#a1a1aa]/40",
    glowClass: "shadow-[0_0_24px_rgba(161,161,170,0.15)]",
    heightClass: "pt-6",
    rankLabel: "2nd",
    rankColor: "text-[#d4d4d8]",
  },
  3: {
    label: "III",
    borderClass: "border-[#b45309]",
    badgeBg: "bg-[#b45309]/10",
    badgeText: "text-[#d97706]",
    badgeBorder: "border-[#b45309]/40",
    glowClass: "shadow-[0_0_20px_rgba(180,83,9,0.15)]",
    heightClass: "pt-4",
    rankLabel: "3rd",
    rankColor: "text-[#d97706]",
  },
} as const;

// ─── ShieldIcon ───────────────────────────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2L3 6.5V12c0 4.97 3.84 9.63 9 10.93C17.16 21.63 21 16.97 21 12V6.5L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────

function PlayerAvatar({
  playerName,
  isEmpty,
  rank,
}: {
  playerName: string;
  isEmpty: boolean;
  rank: 1 | 2 | 3;
}) {
  const cfg = RANK_CONFIG[rank];
  const initials = isEmpty
    ? "?"
    : playerName
        .split(/[\s._-]/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("") || playerName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`
        relative mx-auto mb-4 flex h-16 w-16 items-center justify-center
        rounded-full border-2 ${cfg.borderClass} ${cfg.badgeBg}
        text-xl font-display font-bold ${cfg.badgeText}
      `}
      aria-hidden="true"
    >
      {isEmpty ? (
        <ShieldIcon className={`h-8 w-8 ${cfg.badgeText} opacity-40`} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// ─── Pedestal ─────────────────────────────────────────────────────────────────

export function Pedestal({
  rank,
  category,
  playerName,
  playerAddress,
  statValue,
  isEmpty = false,
}: PedestalProps) {
  const cfg = RANK_CONFIG[rank];

  return (
    <article
      className={`
        relative flex flex-col items-center rounded-xl
        border ${cfg.borderClass} bg-surface-card/60 backdrop-blur-sm
        p-6 ${cfg.heightClass} ${cfg.glowClass}
        transition-shadow duration-300 hover:shadow-none
      `}
    >
      {/* ── Rank badge ── */}
      <div
        className={`
          absolute -top-3.5 left-1/2 -translate-x-1/2
          inline-flex items-center gap-1.5 rounded-full
          border ${cfg.badgeBorder} ${cfg.badgeBg}
          px-3 py-0.5
        `}
      >
        <ShieldIcon className={`h-3 w-3 ${cfg.badgeText}`} />
        <span
          className={`font-display text-xs font-bold tracking-widest uppercase ${cfg.rankColor}`}
        >
          {cfg.rankLabel}
        </span>
      </div>

      {/* ── Category ── */}
      <p className="mb-4 text-center font-display text-xs font-semibold tracking-widest uppercase text-content-muted">
        {category}
      </p>

      {/* ── Avatar ── */}
      <PlayerAvatar playerName={playerName} isEmpty={isEmpty} rank={rank} />

      {/* ── Player name / empty placeholder ── */}
      {isEmpty ? (
        <p className="mb-2 text-center font-body text-sm text-content-muted italic">
          Awaiting a legend…
        </p>
      ) : (
        <Link
          href={`/profile/${playerAddress}`}
          className={`
            mb-2 text-center font-display text-base font-bold ${cfg.rankColor}
            truncate max-w-full
            hover:underline underline-offset-2 transition-colors
          `}
          title={playerAddress}
        >
          {playerName}
        </Link>
      )}

      {/* ── Stat value ── */}
      <p className="mt-auto text-center font-body text-sm text-content-secondary">
        {isEmpty ? "—" : statValue}
      </p>
    </article>
  );
}
