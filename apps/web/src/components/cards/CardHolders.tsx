import Link from "next/link";

// ─── CardHolders ──────────────────────────────────────────────────────────────
// Table of top card holders with rank, address/username, and balance.

interface Holder {
  address: string;
  balance: number;
  username?: string;
}

interface CardHoldersProps {
  holders: Holder[];
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function CardHolders({ holders }: CardHoldersProps) {
  if (holders.length === 0) {
    return (
      <section aria-label="Top holders">
        <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-content-muted">
          Top Holders
        </h3>
        <p className="font-body text-sm text-content-muted italic">
          No holder data available.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Top holders">
      <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-content-muted">
        Top Holders
      </h3>
      <div className="overflow-hidden rounded-lg border border-stroke-base">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke-base bg-surface-elevated">
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-display text-[10px] uppercase tracking-widest text-content-muted"
              >
                Rank
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-display text-[10px] uppercase tracking-widest text-content-muted"
              >
                Holder
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-display text-[10px] uppercase tracking-widest text-content-muted"
              >
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke-base">
            {holders.map((holder, idx) => (
              <tr
                key={holder.address}
                className="bg-surface-card motion-safe:transition-colors motion-safe:duration-150 hover:bg-surface-elevated"
              >
                <td className="px-4 py-3">
                  <span className="font-display text-sm font-semibold text-content-muted">
                    #{idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${holder.address}`}
                    className="font-body text-sm text-veil-400 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400 rounded"
                  >
                    {holder.username
                      ? holder.username
                      : truncateAddress(holder.address)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-display text-sm font-semibold text-content-primary">
                    {holder.balance.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
