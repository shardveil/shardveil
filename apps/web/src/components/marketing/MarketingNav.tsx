"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Whitepaper", href: "/whitepaper" },
  { label: "Cards", href: "/cards" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Hall of Fame", href: "/hall-of-fame" },
  { label: "Leaderboard", href: "/leaderboard" },
] as const;

// ─── MarketingNav ─────────────────────────────────────────────────────────────

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sticky scroll — switch to glass bg after 50px
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Desktop / sticky nav ── */}
      <header
        className={[
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-black/80 backdrop-blur-md border-b border-stroke-base shadow-lg shadow-veil-950/50"
            : "bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 select-none group"
              aria-label="ShardVeil home"
            >
              <span
                aria-hidden="true"
                className="font-display text-2xl text-gold-400 transition-transform group-hover:scale-110"
              >
                ✦
              </span>
              <span className="font-display text-xl tracking-wider text-content-primary group-hover:text-gold-300 transition-colors">
                ShardVeil
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav
              className="hidden md:flex items-center gap-1"
              aria-label="Main navigation"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-body text-content-secondary hover:text-content-primary transition-colors group"
                >
                  {link.label}
                  <span className="absolute inset-x-2 bottom-1 h-px bg-gold-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:block">
              <Link
                href="/connect"
                className="inline-flex items-center gap-2 rounded-md border border-gold-500/60 bg-gold-500/10 px-5 py-2 text-sm font-body font-medium text-gold-300 transition-all hover:bg-gold-500/20 hover:border-gold-400 hover:text-gold-200 hover:shadow-[0_0_16px_rgba(245,158,11,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                Enter the Veil
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="md:hidden rounded-md p-2 text-content-secondary hover:text-content-primary hover:bg-surface-overlay transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400"
            >
              {drawerOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          "fixed top-0 right-0 bottom-0 z-50 w-72 bg-surface-elevated border-l border-stroke-base",
          "flex flex-col pt-16 md:hidden",
          "transition-transform duration-300 ease-in-out",
          drawerOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-md p-2 text-content-secondary hover:text-content-primary hover:bg-surface-overlay transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Mobile nav links */}
        <nav
          className="flex flex-col px-6 py-4 gap-1"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              className="flex items-center py-3 text-base font-body text-content-secondary hover:text-content-primary border-b border-stroke-base/50 transition-colors last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile CTA */}
        <div className="px-6 pt-4 mt-auto pb-8">
          <Link
            href="/connect"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center gap-2 w-full rounded-md border border-gold-500/60 bg-gold-500/10 px-5 py-3 text-sm font-body font-medium text-gold-300 transition-all hover:bg-gold-500/20 hover:border-gold-400 hover:text-gold-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            Enter the Veil
          </Link>

          {/* Decorative divider */}
          <p className="mt-6 text-center text-xs font-body text-content-muted tracking-wider uppercase">
            Dark Fantasy · Arbitrum · NFT
          </p>
        </div>
      </div>
    </>
  );
}
