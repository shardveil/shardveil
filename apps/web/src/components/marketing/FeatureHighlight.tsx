import * as React from "react";

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "gacha",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Dice icon */}
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" />
        <circle cx="22" cy="22" r="1.5" fill="currentColor" />
        <circle cx="22" cy="10" r="1.5" fill="currentColor" />
        <circle cx="10" cy="22" r="1.5" fill="currentColor" />
        {/* Sparkle */}
        <path
          d="M18 6l.5 1.5L20 8l-1.5.5L18 10l-.5-1.5L16 8l1.5-.5L18 6z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    ),
    title: "Verifiable Gacha",
    description:
      "Chainlink VRF + pity system ensures fair card distribution. Every pull is provably random.",
  },
  {
    id: "battles",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Shield icon */}
        <path
          d="M16 3L5 7v9c0 6 5 10 11 13 6-3 11-7 11-13V7L16 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Sword across */}
        <path
          d="M10 22l12-12M20 10l2-2M12 22l-2 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Commit-Reveal Battles",
    description:
      "Cryptographic signatures prevent front-running. Battles are fair, on-chain, and final.",
  },
  {
    id: "amm",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Chart trending up */}
        <polyline
          points="4,22 10,16 16,20 22,10 28,6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 6h6v6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Curve beneath */}
        <path
          d="M4 28h24"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    ),
    title: "Bonding Curve AMM",
    description:
      "Cards priced by an automated market. No hidden fees, no manipulation.",
  },
  {
    id: "economy",
    icon: (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Two coins stacked */}
        <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="18" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 14h4M11 11.5l2 5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M18 18h4M19 15.5l2 5"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    ),
    title: "Dual-Token Economy",
    description: "$VEIL governs the protocol. $SHARD fuels the ecosystem.",
  },
] as const;

// ─── FeatureHighlight ─────────────────────────────────────────────────────────

export function FeatureHighlight() {
  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            id="features-heading"
            className="type-display-3 font-display text-content-primary mb-4"
          >
            Built for{" "}
            <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              Integrity
            </span>
          </h2>
          <p className="type-body-lg text-content-secondary max-w-xl mx-auto">
            Every mechanic is verifiable on-chain. No house edge. No hidden
            levers.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FeatureCard ──────────────────────────────────────────────────────────────

interface FeatureCardProps {
  feature: {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
  };
}

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <div
      className="group relative flex flex-col gap-4 rounded-xl
        border border-stroke-base bg-surface-card p-6
        transition-all duration-300
        hover:border-gold-500/40 hover:bg-surface-elevated
        hover:shadow-[0_0_24px_rgba(245,158,11,0.08)]"
    >
      {/* Gold accent line at top */}
      <div
        className="absolute top-0 left-6 right-6 h-px
          bg-gradient-to-r from-transparent via-gold-500/0 to-transparent
          group-hover:via-gold-500/40 transition-all duration-300"
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="text-gold-400 group-hover:text-gold-300 transition-colors duration-200">
        {feature.icon}
      </div>

      {/* Text */}
      <div>
        <h3 className="type-display-4 font-display text-content-primary mb-2">
          {feature.title}
        </h3>
        <p className="type-body-sm text-content-secondary leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
}
