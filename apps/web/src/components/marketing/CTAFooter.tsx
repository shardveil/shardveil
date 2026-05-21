import Link from "next/link";

// ─── CTAFooter ────────────────────────────────────────────────────────────────

export function CTAFooter() {
  return (
    <section
      className="relative overflow-hidden py-32 px-4 sm:px-6 lg:px-8"
      aria-labelledby="cta-heading"
    >
      {/* Background gradient distinguishing from main content */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-surface-elevated" />
        <div
          className="absolute top-0 left-0 right-0 h-px
            bg-gradient-to-r from-transparent via-stroke-emphasis to-transparent"
        />
        {/* Subtle radial glow */}
        <div
          className="absolute inset-x-0 top-0 h-full
            bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.12),transparent)]"
        />
        {/* Gold shimmer at top center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40
            bg-gold-500/5 blur-3xl"
        />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        {/* Decorative star */}
        <div
          className="mb-6 text-4xl text-gold-400/60 font-display"
          aria-hidden="true"
        >
          ✦
        </div>

        {/* Heading */}
        <h2
          id="cta-heading"
          className="type-display-2 font-display text-content-primary mb-6"
        >
          Begin Your{" "}
          <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent">
            Journey
          </span>
        </h2>

        {/* Subtext */}
        <p className="type-body-lg text-content-secondary mb-10 max-w-lg mx-auto">
          Connect your wallet and step into ShardVeil. The shards await.
        </p>

        {/* CTA button */}
        <Link
          href="/connect"
          className="inline-flex items-center justify-center gap-3 rounded-md
            border border-gold-500/60 bg-gold-500/15 px-10 py-4
            text-lg font-body font-semibold text-gold-200
            transition-all duration-200
            hover:bg-gold-500/25 hover:border-gold-400 hover:text-gold-100
            hover:shadow-[0_0_32px_rgba(245,158,11,0.3)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <span aria-hidden="true">✦</span>
          Enter the Veil
          <span aria-hidden="true">✦</span>
        </Link>

        {/* Trust signal */}
        <p className="mt-8 type-caption text-content-muted tracking-wider uppercase">
          Arbitrum Sepolia · ERC-1155 · Open Source
        </p>
      </div>
    </section>
  );
}
