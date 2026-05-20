import type { Metadata } from "next";

import { CategoryTable } from "@/components/marketing/HallOfFame/CategoryTable";
import { Pedestal } from "@/components/marketing/HallOfFame/Pedestal";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "The greatest players in ShardVeil history — those who pierced the Veil.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HallOfFameData {
  pedestals: {
    apexSeasons: {
      playerName: string;
      playerAddress: string;
      statValue: string;
    } | null;
    guildWarsWon: {
      playerName: string;
      playerAddress: string;
      statValue: string;
    } | null;
    mythicsCrafted: {
      playerName: string;
      playerAddress: string;
      statValue: string;
    } | null;
  };
  categories: {
    battleWins: Array<{
      rank: number;
      playerName: string;
      playerAddress: string;
      wins: string;
      winRate: string;
    }>;
    packsOpened: Array<{
      rank: number;
      playerName: string;
      playerAddress: string;
      packs: string;
      rarestPull: string;
    }>;
    ammVolume: Array<{
      rank: number;
      playerName: string;
      playerAddress: string;
      volume: string;
    }>;
    p2pTrades: Array<{
      rank: number;
      playerName: string;
      playerAddress: string;
      successfulTrades: string;
    }>;
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchHallOfFame(): Promise<HallOfFameData | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/leaderboard/hall-of-fame`,
      { next: { revalidate: 3600 } }, // 1hr cache
    );
    if (!res.ok) throw new Error("unavailable");
    return (await res.json()) as HallOfFameData;
  } catch {
    return null; // null = show empty/launch state
  }
}

// ─── ShieldIcon (decorative) ──────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="h-16 w-16 text-gold-500/40"
    >
      <path
        d="M24 4L6 13V24c0 9.94 7.68 19.26 18 21.86C34.32 43.26 42 33.94 42 24V13L24 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M17 24l5 5 9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── LaunchDayEmptyState ──────────────────────────────────────────────────────

function LaunchDayEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ShieldIcon />
      <p className="font-display text-lg font-semibold text-content-secondary">
        The Hall of Fame awaits its first legends.
      </p>
      <p className="max-w-sm font-body text-sm text-content-muted">
        Prove your worth on the battlefield. The Veil remembers those who dare
        to pierce it.
      </p>
    </div>
  );
}

// ─── HallOfFamePage ───────────────────────────────────────────────────────────

export default async function HallOfFamePage() {
  const data = await fetchHallOfFame();

  // ── Pedestal entries ──────────────────────────────────────────────────────
  const apexEntry = data?.pedestals.apexSeasons ?? null;
  const guildEntry = data?.pedestals.guildWarsWon ?? null;
  const mythicEntry = data?.pedestals.mythicsCrafted ?? null;

  // ── Category table rows ───────────────────────────────────────────────────
  const battleWinRows = (data?.categories.battleWins ?? []).map((r) => ({
    rank: r.rank,
    playerName: r.playerName,
    playerAddress: r.playerAddress,
    values: [r.wins, r.winRate],
  }));

  const packsRows = (data?.categories.packsOpened ?? []).map((r) => ({
    rank: r.rank,
    playerName: r.playerName,
    playerAddress: r.playerAddress,
    values: [r.packs, r.rarestPull],
  }));

  const ammRows = (data?.categories.ammVolume ?? []).map((r) => ({
    rank: r.rank,
    playerName: r.playerName,
    playerAddress: r.playerAddress,
    values: [r.volume],
  }));

  const p2pRows = (data?.categories.p2pTrades ?? []).map((r) => ({
    rank: r.rank,
    playerName: r.playerName,
    playerAddress: r.playerAddress,
    values: [r.successfulTrades],
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* ── Page header ── */}
      <header className="mb-14 text-center">
        {/* Decorative accent line */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold-500/40" />
          <ShieldIcon />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold-500/40" />
        </div>

        <h1 className="font-display text-5xl font-bold tracking-tight text-gold-300 sm:text-6xl">
          Hall of Fame
        </h1>
        <p className="mt-3 font-display text-lg font-medium tracking-widest uppercase text-content-muted">
          Those Who Pierced the Veil
        </p>

        {/* Decorative rule */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px flex-1 max-w-xs bg-gradient-to-r from-transparent to-stroke-emphasis" />
          <span className="text-gold-500/50 font-display text-xs tracking-widest uppercase">
            ✦ All-Time Legends ✦
          </span>
          <div className="h-px flex-1 max-w-xs bg-gradient-to-l from-transparent to-stroke-emphasis" />
        </div>
      </header>

      {/* ── Pedestals section ── */}
      <section aria-labelledby="pedestals-heading" className="mb-16">
        <h2 id="pedestals-heading" className="sr-only">
          Top Legends
        </h2>

        {data === null && !apexEntry && !guildEntry && !mythicEntry ? (
          <LaunchDayEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Most APEX Seasons */}
            <Pedestal
              rank={1}
              category="Most APEX Seasons"
              playerName={apexEntry?.playerName ?? ""}
              playerAddress={apexEntry?.playerAddress ?? ""}
              statValue={apexEntry?.statValue ?? ""}
              isEmpty={!apexEntry}
            />

            {/* Most Guild Wars Won */}
            <Pedestal
              rank={2}
              category="Most Guild Wars Won"
              playerName={guildEntry?.playerName ?? ""}
              playerAddress={guildEntry?.playerAddress ?? ""}
              statValue={guildEntry?.statValue ?? ""}
              isEmpty={!guildEntry}
            />

            {/* Most Mythic Cards Crafted */}
            <Pedestal
              rank={3}
              category="Most Mythic Cards Crafted"
              playerName={mythicEntry?.playerName ?? ""}
              playerAddress={mythicEntry?.playerAddress ?? ""}
              statValue={mythicEntry?.statValue ?? ""}
              isEmpty={!mythicEntry}
            />
          </div>
        )}
      </section>

      {/* ── Category tables section ── */}
      <section aria-labelledby="categories-heading">
        <h2
          id="categories-heading"
          className="mb-8 font-display text-2xl font-bold text-content-primary"
        >
          All-Time Records
        </h2>

        <div className="space-y-10">
          {/* All-time battle wins */}
          <CategoryTable
            title="All-Time Battle Wins"
            columns={["Wins", "Win Rate"]}
            rows={battleWinRows}
            emptyMessage="No battle records yet. The first war has yet to be waged."
          />

          {/* Most packs opened */}
          <CategoryTable
            title="Most Packs Opened"
            columns={["Packs Opened", "Rarest Pull"]}
            rows={packsRows}
            emptyMessage="No packs opened yet. The first Shard awaits."
          />

          {/* Highest AMM volume traded */}
          <CategoryTable
            title="Highest AMM Volume Traded"
            columns={["Total Volume"]}
            rows={ammRows}
            emptyMessage="No AMM trades recorded yet."
          />

          {/* Most successful P2P trades */}
          <CategoryTable
            title="Most Successful P2P Trades"
            columns={["Successful Trades"]}
            rows={p2pRows}
            emptyMessage="No P2P trades recorded yet."
          />
        </div>
      </section>
    </div>
  );
}
