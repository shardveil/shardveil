// ─── PhaseCard ────────────────────────────────────────────────────────────────
// Server component — no "use client" needed.

export type PhaseStatus = "done" | "in-progress" | "planned";

export interface PhaseCardProps {
  phase: number | string; // e.g. 1, "2A", "2B"
  title: string;
  status: PhaseStatus;
  quarter?: string; // e.g. "Q2 2026"
  deliverables: string[];
  description?: string;
}

// ── Status colour config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PhaseStatus,
  {
    borderColor: string;
    badgeBg: string;
    badgeText: string;
    dotClass: string;
    label: string;
    labelClass: string;
  }
> = {
  done: {
    borderColor: "border-l-emerald-500",
    badgeBg: "bg-emerald-950/60",
    badgeText: "text-emerald-400",
    dotClass:
      "flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400",
    label: "Complete",
    labelClass: "text-emerald-400",
  },
  "in-progress": {
    borderColor: "border-l-yellow-400",
    badgeBg: "bg-yellow-950/60",
    badgeText: "text-yellow-300",
    dotClass: "h-3 w-3 rounded-full bg-yellow-400 motion-safe:animate-pulse",
    label: "In Progress",
    labelClass: "text-yellow-300",
  },
  planned: {
    borderColor: "border-l-zinc-600",
    badgeBg: "bg-zinc-900/60",
    badgeText: "text-zinc-400",
    dotClass: "h-3 w-3 rounded-full border border-zinc-500 bg-transparent",
    label: "Planned",
    labelClass: "text-zinc-400",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaseCard({
  phase,
  title,
  status,
  quarter,
  deliverables,
  description,
}: PhaseCardProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <article
      className={[
        "relative rounded-lg border border-stroke-base bg-surface-card",
        "border-l-4",
        cfg.borderColor,
        "p-5 sm:p-6 shadow-md",
        "transition-shadow duration-300 hover:shadow-lg",
      ].join(" ")}
    >
      {/* ── Top row: phase badge + status ── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {/* Phase number badge */}
        <span
          className={[
            "inline-flex items-center justify-center rounded-full px-3 py-0.5",
            "font-display text-xs font-semibold tracking-widest uppercase",
            cfg.badgeBg,
            cfg.badgeText,
            "border border-current/20",
          ].join(" ")}
          aria-label={`Phase ${phase}`}
        >
          Phase {phase}
        </span>

        {/* Status indicator */}
        <span className="flex items-center gap-1.5">
          {status === "done" ? (
            <span className={cfg.dotClass} aria-hidden="true">
              <svg
                viewBox="0 0 12 12"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2,6 5,9 10,3" />
              </svg>
            </span>
          ) : (
            <span className={cfg.dotClass} aria-hidden="true" />
          )}
          <span className={`font-body text-xs font-medium ${cfg.labelClass}`}>
            {cfg.label}
          </span>
        </span>

        {/* Quarter tag */}
        {quarter && (
          <span className="ml-auto font-body text-xs text-content-muted tabular-nums">
            {quarter}
          </span>
        )}
      </div>

      {/* ── Phase title ── */}
      <h3 className="mb-2 font-display text-lg font-semibold tracking-wide text-content-primary">
        {title}
      </h3>

      {/* ── Description ── */}
      {description && (
        <p className="mb-4 font-body text-sm leading-relaxed text-content-secondary">
          {description}
        </p>
      )}

      {/* ── Deliverables ── */}
      <ul
        className="flex flex-wrap gap-2"
        aria-label={`Phase ${phase} deliverables`}
      >
        {deliverables.map((item) => (
          <li
            key={item}
            className={[
              "inline-flex items-center gap-1 rounded px-2 py-0.5",
              "font-body text-xs text-content-muted",
              "border border-stroke-base bg-surface-elevated",
            ].join(" ")}
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
