// Segment config: revalidate every 60 seconds
export const revalidate = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveStatsData {
  cardsMinted: number;
  packsOpened: number;
  battlesTotal: number;
  activePlayers: number;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchLiveStats(): Promise<LiveStatsData> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/stats/live`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error("stats unavailable");
    return (await res.json()) as LiveStatsData;
  } catch {
    return {
      cardsMinted: 0,
      packsOpened: 0,
      battlesTotal: 0,
      activePlayers: 0,
    };
  }
}

// ─── Stat card data ───────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
}

function buildStatItems(data: LiveStatsData): StatItem[] {
  return [
    { label: "Cards Minted", value: data.cardsMinted },
    { label: "Packs Opened", value: data.packsOpened },
    { label: "Battles Fought", value: data.battlesTotal },
    { label: "Active Players (24h)", value: data.activePlayers },
  ];
}

// ─── LiveStats ────────────────────────────────────────────────────────────────

export async function LiveStats() {
  const data = await fetchLiveStats();
  const stats = buildStatItems(data);

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-elevated/50"
      aria-labelledby="stats-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="stats-heading"
            className="type-display-3 font-display text-content-primary mb-3"
          >
            The Veil is{" "}
            <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              Alive
            </span>
          </h2>
          <p className="type-body text-content-secondary">
            Live data refreshed every 60 seconds from the protocol.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ stat }: { stat: StatItem }) {
  const formatted = stat.value.toLocaleString("en-US");

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl
        border border-stroke-base bg-surface-card px-6 py-8
        text-center"
    >
      <span
        className="type-display-2 font-display
          bg-gradient-to-b from-gold-300 to-gold-500 bg-clip-text text-transparent
          tabular-nums"
      >
        {formatted}
        {stat.suffix ?? ""}
      </span>
      <span className="type-body-sm text-content-secondary">{stat.label}</span>
    </div>
  );
}
