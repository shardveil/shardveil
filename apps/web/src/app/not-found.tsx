import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-veil-950 px-4 text-center">
      {/* Large 404 display */}
      <p className="font-display text-[8rem] leading-none font-bold text-veil-800 select-none mb-2">
        404
      </p>

      {/* Decorative divider */}
      <div className="flex items-center gap-3 mb-6">
        <span className="h-px w-16 bg-stroke-base" />
        <span className="text-gold-600 text-lg" aria-hidden>
          ✦
        </span>
        <span className="h-px w-16 bg-stroke-base" />
      </div>

      <h1 className="font-display text-2xl font-semibold text-content-primary tracking-wide mb-3">
        This Portal Leads Nowhere
      </h1>

      <p className="text-content-muted text-sm max-w-xs mb-8">
        The shard you seek has been lost to the veil. It may have been moved,
        destroyed, or never existed in this realm.
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-2.5 rounded-md bg-shard-700 hover:bg-shard-600 active:bg-shard-800 text-white border border-shard-500 text-sm font-body font-medium transition-colors"
      >
        Return to Portal
      </Link>
    </div>
  );
}
