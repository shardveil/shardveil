import { RankCell } from "./RankCell";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuildEntry {
  rank: number;
  guildId: string;
  name: string;
  bannerUrl?: string | null;
  memberCount: number;
  warWins: number;
}

interface GuildsTableProps {
  guilds: GuildEntry[];
}

// ─── GuildsTable ──────────────────────────────────────────────────────────────

export function GuildsTable({ guilds }: GuildsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stroke-base">
      <table className="min-w-[500px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-elevated/80">
            {["Rank", "Guild", "Members", "War Wins"].map((col) => (
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
          {guilds.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-8 text-center font-body text-sm text-content-muted italic"
              >
                No guilds ranked yet.
              </td>
            </tr>
          ) : (
            guilds.map((guild, idx) => (
              <tr
                key={`${guild.guildId}-${guild.rank}`}
                className={[
                  "border-t border-stroke-base",
                  "motion-safe:transition-colors motion-safe:duration-150",
                  idx % 2 === 0 ? "bg-surface-card/40" : "bg-surface-card/20",
                  "hover:bg-surface-elevated/60",
                ].join(" ")}
              >
                {/* Rank */}
                <RankCell rank={guild.rank} />

                {/* Guild */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-body font-bold text-content-primary">
                    {guild.name}
                  </span>
                </td>

                {/* Members */}
                <td className="px-4 py-3 whitespace-nowrap font-body tabular-nums text-content-secondary">
                  {guild.memberCount.toLocaleString("en-US")}
                </td>

                {/* War Wins */}
                <td className="px-4 py-3 whitespace-nowrap font-body tabular-nums text-content-secondary">
                  {guild.warWins.toLocaleString("en-US")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
