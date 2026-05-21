import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryTableRow {
  rank: number;
  playerName: string;
  playerAddress: string;
  values: string[];
}

export interface CategoryTableProps {
  title: string;
  columns: string[];
  rows: CategoryTableRow[];
  emptyMessage?: string;
}

// ─── RankBadge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank === 1
      ? "text-gold-300 font-bold"
      : rank === 2
        ? "text-[#d4d4d8] font-semibold"
        : rank === 3
          ? "text-[#d97706] font-semibold"
          : "text-content-muted";

  return (
    <span className={`font-display text-sm tabular-nums ${color}`}>{rank}</span>
  );
}

// ─── CategoryTable ────────────────────────────────────────────────────────────

export function CategoryTable({
  title,
  columns,
  rows,
  emptyMessage = "No records yet. The legend has not been written.",
}: CategoryTableProps) {
  const tableId = `table-title-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const allColumns = ["Rank", "Player", ...columns];

  return (
    <section aria-labelledby={tableId}>
      {/* ── Section heading ── */}
      <h3
        id={tableId}
        className="mb-3 font-display text-base font-semibold tracking-wider text-gold-300 uppercase"
      >
        {title}
      </h3>

      {/* ── Responsive wrapper ── */}
      <div className="overflow-x-auto rounded-xl border border-stroke-subtle">
        <table className="min-w-full border-collapse text-sm">
          {/* ── Column headers ── */}
          <thead>
            <tr className="bg-surface-overlay/80">
              {allColumns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className={`
                    px-4 py-3 text-left font-display text-xs font-semibold
                    tracking-widest uppercase text-content-muted
                    whitespace-nowrap
                    ${col === "Rank" ? "w-16" : ""}
                  `}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={allColumns.length}
                  className="px-4 py-8 text-center font-body text-sm text-content-muted italic"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={`${row.playerAddress}-${row.rank}-${idx}`}
                  className={`
                    border-t border-stroke-subtle
                    transition-colors duration-150
                    ${idx % 2 === 0 ? "bg-surface-card/40" : "bg-surface-card/20"}
                    hover:bg-surface-overlay/60
                  `}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <RankBadge rank={row.rank} />
                  </td>

                  {/* Player */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/profile/${row.playerAddress}`}
                      className="font-body font-medium text-content-primary hover:text-gold-300 transition-colors duration-150"
                      title={row.playerAddress}
                    >
                      {row.playerName}
                    </Link>
                  </td>

                  {/* Dynamic value columns */}
                  {row.values.map((val, vIdx) => (
                    <td
                      key={vIdx}
                      className="px-4 py-3 whitespace-nowrap font-body text-content-secondary"
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
