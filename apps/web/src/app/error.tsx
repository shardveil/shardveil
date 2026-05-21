"use client";

import Link from "next/link";

// TODO: Module 21 — report to Sentry here

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-veil-950 px-4 text-center">
      {/* Decorative rune */}
      <div className="mb-6 text-blood-600 text-6xl select-none" aria-hidden>
        ⚔
      </div>

      <h1 className="font-display text-3xl font-bold text-blood-400 mb-2 tracking-widest uppercase">
        Something Went Wrong
      </h1>

      <p className="text-content-secondary text-sm mb-1 max-w-md">
        The veil has fractured. An unexpected error occurred in this realm.
      </p>

      {error.message && (
        <p className="text-content-muted text-xs mb-1 max-w-sm break-words font-mono bg-surface-elevated border border-stroke-base rounded px-3 py-2">
          {error.message}
        </p>
      )}

      {error.digest && (
        <p className="text-content-muted text-xs mb-6">
          Error ID:{" "}
          <span className="font-mono text-gold-500">{error.digest}</span>
        </p>
      )}

      {!error.digest && <div className="mb-6" />}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-md bg-blood-700 hover:bg-blood-600 active:bg-blood-800 text-white border border-blood-500 text-sm font-body font-medium transition-colors"
        >
          Try Again
        </button>

        <Link
          href="/dashboard"
          className="px-6 py-2.5 rounded-md bg-surface-elevated hover:bg-surface-card text-content-primary border border-stroke-base text-sm font-body font-medium transition-colors"
        >
          Return to Portal
        </Link>
      </div>
    </div>
  );
}
