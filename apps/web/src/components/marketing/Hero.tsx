"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Hero() {
  const [showChevron, setShowChevron] = useState(false);

  // Fade in scroll indicator after 1 second
  useEffect(() => {
    const timer = setTimeout(() => setShowChevron(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* ── Animated background layers ── */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* Base dark */}
        <div className="absolute inset-0 bg-[#0d0a1a]" />

        {/* Pulsing deep purple blob — top left */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full
            bg-veil-900/40 blur-[120px] animate-pulse"
          style={{ animationDuration: "6s" }}
        />

        {/* Pulsing deep purple blob — bottom right */}
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full
            bg-veil-800/30 blur-[100px] animate-pulse"
          style={{ animationDuration: "8s", animationDelay: "2s" }}
        />

        {/* Gold accent — top center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px]
            bg-gold-900/10 blur-[80px] animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "1s" }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,58,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
          <span className="type-caption text-gold-300 tracking-widest uppercase">
            Now live on Arbitrum Sepolia
          </span>
        </div>

        {/* Main tagline */}
        <h1 className="type-display-1 font-display mb-6">
          <span
            className="block bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200
              bg-clip-text text-transparent"
          >
            Collect the Shards.
          </span>
          <span
            className="block bg-gradient-to-r from-gold-200 via-gold-300 to-gold-400
              bg-clip-text text-transparent"
          >
            Pierce the Veil.
          </span>
        </h1>

        {/* Subheading */}
        <p className="type-body-lg text-content-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          A dark fantasy card protocol built on Arbitrum. Verifiable gacha.
          Cryptographic battles. Transparent markets.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary CTA */}
          <Link
            href="/connect"
            className="inline-flex items-center justify-center gap-2 rounded-md
              border border-gold-500/60 bg-gold-500/15 px-8 py-3.5
              text-base font-body font-semibold text-gold-200
              transition-all duration-200
              hover:bg-gold-500/25 hover:border-gold-400 hover:text-gold-100
              hover:shadow-[0_0_24px_rgba(245,158,11,0.3)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            Enter the Veil
          </Link>

          {/* Secondary ghost CTA */}
          <Link
            href="/whitepaper"
            className="inline-flex items-center justify-center gap-2 rounded-md
              border border-stroke-emphasis bg-transparent px-8 py-3.5
              text-base font-body font-medium text-content-secondary
              transition-all duration-200
              hover:bg-surface-overlay hover:text-content-primary hover:border-veil-400
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400"
          >
            Read the Whitepaper
          </Link>
        </div>

        {/* Decorative divider */}
        <div className="mt-16 flex items-center justify-center gap-4">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-stroke-emphasis" />
          <span className="text-gold-500/60 text-xs font-display tracking-widest uppercase">
            ✦ Dark Fantasy · Arbitrum · NFT ✦
          </span>
          <div className="h-px w-24 bg-gradient-to-l from-transparent to-stroke-emphasis" />
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2
          transition-opacity duration-700"
        style={{ opacity: showChevron ? 1 : 0 }}
      >
        <span className="type-caption text-content-muted tracking-wider uppercase">
          Scroll
        </span>
        {/* Animated chevron down */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="text-content-muted animate-bounce"
          style={{ animationDuration: "1.5s" }}
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
