import type { Metadata } from "next";

import {
  type CrafterEntry,
  CraftersTable,
} from "@/components/leaderboard/CraftersTable";
import {
  type GuildEntry,
  GuildsTable,
} from "@/components/leaderboard/GuildsTable";
import {
  type RankedPlayer,
  RankedTable,
} from "@/components/leaderboard/RankedTable";

import { LeaderboardTabs } from "./LeaderboardTabs";

// ─── Revalidation ─────────────────────────────────────────────────────────────

export const revalidate = 300; // 5 minutes

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Leaderboard | ShardVeil",
  description: "Top players, guilds, and crafters in ShardVeil.",
};

// ─── API base ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchRanked(): Promise<RankedPlayer[]> {
  try {
    const res = await fetch(`${API_URL}/leaderboard/ranked?season=current`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("unavailable");
    const data = (await res.json()) as {
      players: RankedPlayer[];
      season: number;
    };
    return data.players ?? [];
  } catch {
    return [];
  }
}

async function fetchGuilds(): Promise<GuildEntry[]> {
  try {
    const res = await fetch(`${API_URL}/leaderboard/guilds`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("unavailable");
    const data = (await res.json()) as { guilds: GuildEntry[] };
    return data.guilds ?? [];
  } catch {
    return [];
  }
}

async function fetchCrafters(): Promise<CrafterEntry[]> {
  try {
    const res = await fetch(`${API_URL}/leaderboard/crafters`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("unavailable");
    const data = (await res.json()) as { crafters: CrafterEntry[] };
    return data.crafters ?? [];
  } catch {
    return [];
  }
}

// ─── SwordsIcon (decorative) ──────────────────────────────────────────────────

function SwordsIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="h-14 w-14 text-veil-400/50"
    >
      {/* Sword 1 (top-left to bottom-right) */}
      <line
        x1="8"
        y1="8"
        x2="32"
        y2="32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Guard 1 */}
      <line
        x1="22"
        y1="14"
        x2="30"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Sword 2 (top-right to bottom-left) */}
      <line
        x1="40"
        y1="8"
        x2="16"
        y2="32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Guard 2 */}
      <line
        x1="18"
        y1="14"
        x2="26"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Handles */}
      <line
        x1="8"
        y1="40"
        x2="16"
        y2="32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="40"
        y1="40"
        x2="32"
        y2="32"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── LeaderboardPage ──────────────────────────────────────────────────────────

export default async function LeaderboardPage() {
  const [players, guilds, crafters] = await Promise.all([
    fetchRanked(),
    fetchGuilds(),
    fetchCrafters(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      {/* ── Page header ── */}
      <header className="mb-14 text-center">
        {/* Decorative accent */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-veil-400/40" />
          <SwordsIcon />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-veil-400/40" />
        </div>

        <h1 className="font-display text-5xl font-bold tracking-tight text-content-primary sm:text-6xl">
          The Rankings
        </h1>
        <p className="mt-3 font-display text-lg font-medium tracking-widest uppercase text-content-muted">
          Season Standings &amp; Glory
        </p>

        {/* Decorative rule */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px max-w-xs flex-1 bg-gradient-to-r from-transparent to-stroke-emphasis" />
          <span className="font-display text-xs tracking-widest uppercase text-veil-400/50">
            ✦ Live Season Data ✦
          </span>
          <div className="h-px max-w-xs flex-1 bg-gradient-to-l from-transparent to-stroke-emphasis" />
        </div>
      </header>

      {/* ── Tabs + Tables ── */}
      <LeaderboardTabs
        rankedSlot={<RankedTable players={players} />}
        guildsSlot={<GuildsTable guilds={guilds} />}
        craftersSlot={<CraftersTable crafters={crafters} />}
      />
    </div>
  );
}
