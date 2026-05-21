interface RankCellProps {
  rank: number;
}

const RANK_COLORS: Record<number, string> = {
  1: "text-yellow-400 font-bold",
  2: "text-zinc-300 font-semibold",
  3: "text-amber-600 font-semibold",
};

export function RankCell({ rank }: RankCellProps) {
  const colorClass = RANK_COLORS[rank] ?? "text-content-muted";
  return (
    <td className="py-3 pl-4 pr-3 font-display text-sm">
      <span className={colorClass}>#{rank}</span>
    </td>
  );
}
