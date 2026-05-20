"use client";

import { useEffect, useRef, useState } from "react";

import type { WhitepaperSection } from "./Section";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableOfContentsProps {
  sections: WhitepaperSection[];
}

// ─── TableOfContents ──────────────────────────────────────────────────────────

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track which section is currently in view via IntersectionObserver
  useEffect(() => {
    const sectionEls = sections.map((s) =>
      document.getElementById(`section-${s.id}`),
    );

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          // Extract section id from element id: "section-{id}"
          const rawId = visible[0]!.target.id;
          const sectionId = rawId.replace(/^section-/, "");
          setActiveId(sectionId);
        }
      },
      {
        rootMargin: "-96px 0px -40% 0px",
        threshold: 0,
      },
    );

    const observer = observerRef.current;
    sectionEls.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  // Focus first link in panel on open; restore trigger on close
  useEffect(() => {
    if (mobileOpen) {
      const firstLink = panelRef.current?.querySelector<HTMLElement>("a");
      firstLink?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [mobileOpen]);

  function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const target = document.getElementById(`section-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      // Update URL hash without jumping
      window.history.pushState(null, "", `#section-${id}`);
      setActiveId(id);
    }
    setMobileOpen(false);
  }

  const tocList = (
    <nav aria-label="Table of contents">
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          const indent =
            section.level === 2
              ? "pl-4"
              : section.level === 3
                ? "pl-8"
                : "pl-0";

          return (
            <li key={section.id} className={indent}>
              <a
                href={`#section-${section.id}`}
                onClick={(e) => handleLinkClick(e, section.id)}
                aria-current={isActive ? "location" : undefined}
                className={[
                  "block py-1.5 pr-3 text-sm font-body leading-snug transition-all duration-150",
                  "border-l-2 pl-3",
                  isActive
                    ? "border-gold-400 text-gold-300 font-medium"
                    : "border-transparent text-content-muted hover:text-content-secondary hover:border-veil-400",
                  section.level === 1 ? "text-[0.875rem]" : "text-[0.8125rem]",
                ].join(" ")}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* ── Desktop sticky TOC ── */}
      <aside
        aria-label="Whitepaper table of contents"
        className="hidden lg:block w-64 shrink-0"
      >
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 scrollbar-thin">
          <p className="mb-4 text-xs font-body font-semibold uppercase tracking-widest text-content-muted">
            Contents
          </p>
          {tocList}
        </div>
      </aside>

      {/* ── Mobile floating TOC toggle ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          ref={triggerRef}
          type="button"
          aria-label={
            mobileOpen ? "Close table of contents" : "Open table of contents"
          }
          aria-expanded={mobileOpen}
          aria-controls="mobile-toc-panel"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-veil-900 border border-veil-600 text-gold-400 shadow-lg shadow-veil-950/50 hover:bg-veil-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <span aria-hidden="true" className="text-lg leading-none select-none">
            {mobileOpen ? "✕" : "≡"}
          </span>
        </button>
      </div>

      {/* ── Mobile TOC panel ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            id="mobile-toc-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Table of contents"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileOpen(false);
            }}
            className="lg:hidden fixed bottom-24 right-6 z-40 w-72 max-h-[60vh] overflow-y-auto rounded-xl bg-surface-elevated border border-stroke-base shadow-2xl shadow-veil-950/50 p-5"
          >
            <p className="mb-3 text-xs font-body font-semibold uppercase tracking-widest text-content-muted">
              Contents
            </p>
            {tocList}
          </div>
        </>
      )}
    </>
  );
}
