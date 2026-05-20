import type { Metadata } from "next";

import { Timeline } from "@/components/marketing/Roadmap/Timeline";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "ShardVeil development roadmap — from core contracts to mainnet launch.",
};

// ─── RoadmapPage ──────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* ── Ambient background blobs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-veil-900/20 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gold-900/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* ── Page header ── */}
        <header className="mb-14 md:mb-20 text-center max-w-2xl mx-auto">
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-widest text-gold-400">
            Development Progress
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-content-primary mb-4">
            Roadmap
          </h1>
          <p className="font-body text-content-secondary leading-relaxed text-lg">
            From ten core contracts on Arbitrum Sepolia to a fully audited
            mainnet launch — every milestone, transparently tracked on-chain.
          </p>

          {/* ── Legend ── */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-body text-content-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Complete
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 motion-safe:animate-pulse" />
              In Progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-zinc-500 bg-transparent" />
              Planned
            </span>
          </div>
        </header>

        {/* ── Timeline ── */}
        <Timeline />

        {/* ── Footer note ── */}
        <footer className="mt-20 pt-8 border-t border-stroke-base text-center">
          <p className="font-body text-sm text-content-muted leading-relaxed max-w-[60ch] mx-auto">
            Milestone completion is ratified through on-chain governance. Track
            contract deployments in real time on{" "}
            <a
              href="https://sepolia.arbiscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-400 hover:text-gold-300 underline underline-offset-2 transition-colors"
            >
              Arbiscan
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
