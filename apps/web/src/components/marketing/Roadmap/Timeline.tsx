// ─── Timeline ─────────────────────────────────────────────────────────────────
// Server component — no "use client" needed.
// Renders a vertical timeline of ShardVeil development phases.
// Desktop: phase cards alternate left/right (odd on left, even on right).
// Mobile:  all cards stack vertically, timeline line on left.

import { PhaseCard, type PhaseCardProps } from "./PhaseCard";

// ─── Phase data ───────────────────────────────────────────────────────────────

const PHASES: PhaseCardProps[] = [
  {
    phase: 1,
    title: "Core Protocol",
    status: "done",
    quarter: "Q1 2026",
    deliverables: [
      "CardNFT",
      "PackContract (VRF)",
      "AMMMarketplace",
      "BattleEngine",
      "CraftingEngine",
      "GuildRegistry",
      "TradeEscrow",
      "TournamentEngine",
      "ProfileRegistry",
      "SeasonPass",
    ],
    description: "Ten core smart contracts deployed on Arbitrum Sepolia.",
  },
  {
    phase: "2A",
    title: "Protocol Expansion",
    status: "in-progress",
    quarter: "Q2 2026",
    deliverables: [
      "QuestEngine",
      "AchievementRegistry",
      "CosmeticRegistry",
      "ReferralRegistry",
    ],
    description: "Expanding gameplay with quests, achievements, and cosmetics.",
  },
  {
    phase: "2B",
    title: "Social Layer",
    status: "planned",
    quarter: "Q3 2026",
    deliverables: [
      "Guild Wars",
      "P2P Trades",
      "Seasonal Events",
      "Leaderboard Seasons",
    ],
    description: "Competitive social features and recurring events.",
  },
  {
    phase: 3,
    title: "Governance",
    status: "planned",
    quarter: "Q3 2026",
    deliverables: [
      "Governor contract",
      "Timelock",
      "Proposal system",
      "Community voting",
    ],
    description:
      "On-chain governance enabling $VEIL holders to govern the protocol.",
  },
  {
    phase: 4,
    title: "Security Audit",
    status: "planned",
    quarter: "Q4 2026",
    deliverables: [
      "External audit firm",
      "Bug bounty program",
      "Audit report published",
    ],
    description: "Full external audit before mainnet launch.",
  },
  {
    phase: 5,
    title: "Mainnet Launch",
    status: "planned",
    quarter: "Q1 2027",
    deliverables: [
      "Arbitrum One deployment",
      "Token Generation Event",
      "Exchange listings",
      "Public launch",
    ],
    description: "ShardVeil goes live on Arbitrum mainnet.",
  },
];

// ─── Connector dot colour per status ─────────────────────────────────────────

const DOT_CLASS: Record<string, string> = {
  done: "bg-emerald-500 border-emerald-400",
  "in-progress": "bg-yellow-400 border-yellow-300 motion-safe:animate-pulse",
  planned: "bg-zinc-700 border-zinc-500",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Timeline() {
  return (
    <section
      className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"
      aria-label="Development timeline"
    >
      {/*
        ────────────────────────────────────────────────
        Central vertical line
        Mobile:  absolute left edge (left-8)
        Desktop: absolute horizontal centre (md:left-1/2)
        ────────────────────────────────────────────────
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-8 w-px md:left-1/2 md:-translate-x-px bg-gradient-to-b from-veil-700 via-gold-700/60 to-zinc-700"
      />

      {/* ── Phase list ── */}
      <ol className="relative space-y-10 md:space-y-14">
        {PHASES.map((phase, index) => {
          const isLeft = index % 2 === 0; // even index → desktop left column

          return (
            <li key={`${phase.phase}`} className="relative">
              {/* ── Connector dot (on the central vertical line) ── */}
              <span
                aria-hidden="true"
                className={[
                  "absolute z-10 h-4 w-4 rounded-full border-2 shadow-md",
                  DOT_CLASS[phase.status] ?? "bg-zinc-700 border-zinc-500",
                  // Mobile: align with left line (left-8 - 8px half-dot)
                  "left-8 top-5 -translate-x-1/2",
                  // Desktop: align with centre line
                  "md:left-1/2",
                ].join(" ")}
              />

              {/*
                ── Card placement ──
                Mobile: card sits to the right of the left line (pl-16).
                Desktop:
                  - even index (isLeft) → card in LEFT half  (pr on right half, card in left)
                  - odd index (!isLeft) → card in RIGHT half (pl on left half, card in right)
              */}
              <div
                className={[
                  // Mobile: all cards right of the line
                  "pl-16 sm:pl-20",
                  // Desktop: alternate halves
                  "md:pl-0 md:pr-0 md:grid md:grid-cols-2 md:gap-10 md:items-center",
                ].join(" ")}
              >
                {/* LEFT slot — only rendered for even-index phases on desktop */}
                <div
                  className={[
                    "hidden md:block md:pr-6",
                    isLeft ? "" : "md:invisible md:pointer-events-none",
                  ].join(" ")}
                  aria-hidden={!isLeft}
                >
                  {isLeft && <PhaseCard {...phase} />}
                </div>

                {/* RIGHT slot — only rendered for odd-index phases on desktop */}
                <div
                  className={[
                    "hidden md:block md:pl-6",
                    !isLeft ? "" : "md:invisible md:pointer-events-none",
                  ].join(" ")}
                  aria-hidden={isLeft}
                >
                  {!isLeft && <PhaseCard {...phase} />}
                </div>

                {/* MOBILE slot — always shows, hidden on desktop */}
                <div className="md:hidden">
                  <PhaseCard {...phase} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
