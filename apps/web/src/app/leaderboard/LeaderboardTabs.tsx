"use client";

import { type ReactNode, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "ranked" | "guilds" | "crafters";

interface Tab {
  key: TabKey;
  label: string;
}

interface LeaderboardTabsProps {
  rankedSlot: ReactNode;
  guildsSlot: ReactNode;
  craftersSlot: ReactNode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: "ranked", label: "Ranked" },
  { key: "guilds", label: "Guilds" },
  { key: "crafters", label: "Crafters" },
];

// ─── LeaderboardTabs ──────────────────────────────────────────────────────────

export function LeaderboardTabs({
  rankedSlot,
  guildsSlot,
  craftersSlot,
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("ranked");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const content: Record<TabKey, ReactNode> = {
    ranked: rankedSlot,
    guilds: guildsSlot,
    crafters: craftersSlot,
  };

  return (
    <div>
      {/* ── Tab bar ── */}
      <div
        role="tablist"
        aria-label="Leaderboard categories"
        className="mb-6 flex gap-2 border-b border-stroke-base pb-0"
        onKeyDown={(e) => {
          const tabs = ["ranked", "guilds", "crafters"] as const;
          const idx = tabs.indexOf(activeTab);
          if (e.key === "ArrowRight") {
            const next = tabs[(idx + 1) % tabs.length]!;
            setActiveTab(next);
            tabRefs.current[(idx + 1) % tabs.length]?.focus();
            e.preventDefault();
          } else if (e.key === "ArrowLeft") {
            const prev = tabs[(idx - 1 + tabs.length) % tabs.length]!;
            setActiveTab(prev);
            tabRefs.current[(idx - 1 + tabs.length) % tabs.length]?.focus();
            e.preventDefault();
          }
        }}
      >
        {TABS.map(({ key, label }, i) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`tabpanel-${key}`}
              id={`tab-${key}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(key)}
              className={[
                "relative -mb-px rounded-t-lg border border-b-0 px-5 py-2.5",
                "font-display text-sm uppercase tracking-wider",
                "motion-safe:transition-all motion-safe:duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
                isActive
                  ? "border-veil-500/40 bg-veil-800/40 text-content-primary"
                  : "border-transparent text-content-muted hover:text-content-secondary",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ── */}
      {TABS.map(({ key }) => (
        <div
          key={key}
          role="tabpanel"
          id={`tabpanel-${key}`}
          aria-labelledby={`tab-${key}`}
          hidden={activeTab !== key}
        >
          {content[key]}
        </div>
      ))}
    </div>
  );
}
