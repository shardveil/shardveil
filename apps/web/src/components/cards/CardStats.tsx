// ─── CardStats ────────────────────────────────────────────────────────────────
// Displays power, defense, element, and abilities for a card.

import type { CardAbility } from "@/types/card";

interface CardStatsProps {
  /** atkBase from CardRegistry. */
  power?: number | undefined;
  /** defBase from CardRegistry. */
  defense?: number | undefined;
  /** spdBase from CardRegistry. */
  speed?: number | undefined;
  /** hpBase from CardRegistry. */
  health?: number | undefined;
  element?: string | undefined;
  abilities?: CardAbility[] | undefined;
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function SwordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-red-400"
    >
      <path
        d="M14.5 2.5l7 7-12 12-3-3 1-4L3 9l4-1 3-3 4.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 21l3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-blue-400"
    >
      <path
        d="M12 2L4 6v6c0 5 3.5 9.74 8 11 4.5-1.26 8-6 8-11V6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
}

function ElementIcon({ element }: { element: string }) {
  const lower = element.toLowerCase();
  if (lower === "fire") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 text-orange-400"
      >
        <path
          d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <path
          d="M12 14c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (lower === "water" || lower === "ice") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 text-cyan-400"
      >
        <path
          d="M12 2c0 8-7 10-7 16a7 7 0 0014 0C19 12 12 10 12 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.1"
        />
      </svg>
    );
  }
  if (lower === "earth" || lower === "nature") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-4 w-4 text-green-400"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <path
          d="M12 3v18M3 12h18"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.5"
        />
      </svg>
    );
  }
  // Generic / other elements
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-veil-400"
    >
      <path
        d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-amber-400"
    >
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4 text-emerald-400"
    >
      <path
        d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 8a3.5 3.5 0 017 2.5c0 5-7 9.5-7 9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
}

/** One stat cell. `—` when the value is absent, never "undefined". */
function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | undefined;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-stroke-base bg-surface-elevated px-3 py-3">
      {icon}
      <span className="font-display text-xl font-bold text-content-primary">
        {value ?? "—"}
      </span>
      <span className="font-body text-[10px] uppercase tracking-widest text-content-muted">
        {label}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardStats({
  power,
  defense,
  speed,
  health,
  element,
  abilities,
}: CardStatsProps) {
  const hasStats =
    power !== undefined ||
    defense !== undefined ||
    speed !== undefined ||
    health !== undefined ||
    element !== undefined;
  const hasAbilities = abilities && abilities.length > 0;

  if (!hasStats && !hasAbilities) {
    return (
      <section aria-label="Card stats">
        <p className="font-body text-sm text-content-muted italic">
          No stats available.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Card stats" className="space-y-4">
      {/* ── Stat grid ── */}
      {hasStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={<SwordIcon />} value={power} label="Attack" />
          <StatTile icon={<ShieldIcon />} value={defense} label="Defense" />
          <StatTile icon={<BoltIcon />} value={speed} label="Speed" />
          <StatTile icon={<HeartIcon />} value={health} label="Health" />
        </div>
      )}

      {element && (
        <div className="flex items-center gap-2 rounded-lg border border-stroke-base bg-surface-elevated px-3 py-2">
          <ElementIcon element={element} />
          <span className="font-body text-[10px] uppercase tracking-widest text-content-muted">
            Type
          </span>
          <span className="ml-auto font-display text-sm font-bold text-content-primary">
            {element}
          </span>
        </div>
      )}

      {/* ── Abilities ── */}
      {hasAbilities && (
        <div className="space-y-2">
          <h3 className="font-display text-xs uppercase tracking-widest text-content-muted">
            Abilities
          </h3>
          <ul className="space-y-2">
            {(abilities ?? []).map((ability) => (
              <li
                key={ability.name}
                className="rounded-lg border border-stroke-base bg-surface-elevated p-3"
              >
                <p className="font-display text-sm font-semibold text-veil-400">
                  {ability.name}
                </p>
                <p className="mt-0.5 font-body text-sm leading-relaxed text-content-secondary">
                  {ability.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
