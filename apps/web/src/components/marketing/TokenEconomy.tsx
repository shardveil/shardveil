// ─── Token data ───────────────────────────────────────────────────────────────

const VEIL_TOKEN = {
  symbol: "$VEIL",
  name: "Governance Token",
  color: "veil" as const,
  attributes: [
    { label: "Hard cap", value: "1,000,000,000" },
    { label: "Role", value: "Governance" },
    { label: "Utility", value: "Staking rewards" },
    { label: "Revenue", value: "Protocol fees" },
  ],
  bullets: [
    "Vote on protocol upgrades",
    "Stake to earn fee share",
    "Treasury management rights",
    "Unlock exclusive card frames",
  ],
} as const;

const SHARD_TOKEN = {
  symbol: "$SHARD",
  name: "Ecosystem Token",
  color: "shard" as const,
  attributes: [
    { label: "Supply", value: "Inflationary / deflationary" },
    { label: "Earned via", value: "Battles & packs" },
    { label: "Burned via", value: "Crafting" },
    { label: "Revenue", value: "Marketplace fees" },
  ],
  bullets: [
    "Earn by winning battles",
    "Earned from pack opening",
    "Burned during card crafting",
    "Powers the marketplace",
  ],
} as const;

// ─── TokenEconomy ─────────────────────────────────────────────────────────────

export function TokenEconomy() {
  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8"
      aria-labelledby="economy-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            id="economy-heading"
            className="type-display-3 font-display text-content-primary mb-4"
          >
            Dual-Token{" "}
            <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
              Economy
            </span>
          </h2>
          <p className="type-body-lg text-content-secondary max-w-xl mx-auto">
            Two tokens. One ecosystem. Designed for long-term sustainability.
          </p>
        </div>

        {/* Token cards + flow arrow */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8">
          {/* $VEIL card */}
          <TokenCard
            token={VEIL_TOKEN}
            accentClass="border-veil-500/40 hover:border-veil-400/60"
            glowClass="hover:shadow-[0_0_32px_rgba(124,58,237,0.12)]"
            badgeClass="border-veil-500/40 bg-veil-500/10 text-veil-300"
            dotClass="bg-veil-400"
          />

          {/* Flow indicator */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-2 py-4 lg:py-0 lg:px-2 shrink-0">
            <EconomyFlowArrow />
          </div>

          {/* $SHARD card */}
          <TokenCard
            token={SHARD_TOKEN}
            accentClass="border-shard-500/40 hover:border-shard-400/60"
            glowClass="hover:shadow-[0_0_32px_rgba(59,130,246,0.12)]"
            badgeClass="border-shard-500/40 bg-shard-500/10 text-shard-300"
            dotClass="bg-shard-400"
          />
        </div>

        {/* Economic loop description */}
        <div className="mt-12 rounded-xl border border-stroke-base bg-surface-card p-6 text-center">
          <p className="type-body text-content-secondary max-w-2xl mx-auto">
            <span className="text-veil-300 font-medium">$VEIL</span> holders
            govern the protocol and earn a share of fees.{" "}
            <span className="text-shard-300 font-medium">$SHARD</span> is earned
            through gameplay and burned via crafting, creating an equilibrium
            between supply and demand.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── TokenCard ────────────────────────────────────────────────────────────────

interface TokenData {
  symbol: string;
  name: string;
  attributes: readonly { label: string; value: string }[];
  bullets: readonly string[];
}

interface TokenCardProps {
  token: TokenData;
  accentClass: string;
  glowClass: string;
  badgeClass: string;
  dotClass: string;
}

function TokenCard({
  token,
  accentClass,
  glowClass,
  badgeClass,
  dotClass,
}: TokenCardProps) {
  return (
    <div
      className={[
        "flex-1 rounded-xl border bg-surface-card p-8",
        "transition-all duration-300",
        accentClass,
        glowClass,
      ].join(" ")}
    >
      {/* Token badge */}
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 mb-6 ${badgeClass}`}
      >
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="type-caption font-display tracking-widest font-semibold">
          {token.symbol}
        </span>
      </div>

      {/* Token name */}
      <h3 className="type-display-4 font-display text-content-primary mb-6">
        {token.name}
      </h3>

      {/* Key attributes */}
      <dl className="space-y-3 mb-8">
        {token.attributes.map((attr) => (
          <div
            key={attr.label}
            className="flex items-start justify-between gap-4"
          >
            <dt className="type-body-sm text-content-muted shrink-0">
              {attr.label}
            </dt>
            <dd className="type-body-sm text-content-secondary text-right">
              {attr.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Divider */}
      <div className="h-px bg-stroke-base mb-6" />

      {/* Bullet points */}
      <ul className="space-y-2.5">
        {token.bullets.map((bullet, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass} opacity-70`}
              aria-hidden="true"
            />
            <span className="type-body-sm text-content-secondary">
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── EconomyFlowArrow ─────────────────────────────────────────────────────────

function EconomyFlowArrow() {
  return (
    <div className="flex flex-col items-center gap-1 text-content-muted">
      {/* Vertical on mobile, horizontal on lg */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="rotate-90 lg:rotate-0"
      >
        <path
          d="M8 20h24M24 14l6 6-6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gold-500/50"
        />
      </svg>
      <span className="type-caption text-content-muted hidden lg:block">
        flows to
      </span>
    </div>
  );
}
