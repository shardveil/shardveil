import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardData {
  id: number;
  name: string;
  rarity: string;
  imageUrl: string | null;
  minted: number;
  supplyCap: number;
  power?: number;
}

// ─── Rarity helpers ───────────────────────────────────────────────────────────

type RarityKey =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

const RARITY_LABEL: Record<RarityKey, string> = {
  COMMON: "Common",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
  MYTHIC: "Mythic",
};

const RARITY_BADGE_CLASS: Record<RarityKey, string> = {
  COMMON: "bg-zinc-700 text-zinc-300 border-zinc-600",
  UNCOMMON: "bg-green-900/60 text-green-400 border-green-700",
  RARE: "bg-blue-900/60 text-blue-400 border-blue-700",
  EPIC: "bg-purple-900/60 text-purple-400 border-purple-700",
  LEGENDARY: "bg-yellow-900/60 text-yellow-400 border-yellow-700",
  MYTHIC: "bg-pink-900/60 text-pink-400 border-pink-700",
};

const RARITY_GLOW_CLASS: Record<RarityKey, string> = {
  COMMON: "hover:shadow-[0_0_20px_rgba(156,163,175,0.4)] hover:border-zinc-500",
  UNCOMMON:
    "hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:border-green-600",
  RARE: "hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:border-blue-600",
  EPIC: "hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:border-purple-600",
  LEGENDARY:
    "hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:border-yellow-600",
  MYTHIC: "hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:border-pink-600",
};

const RARITY_BAR_CLASS: Record<RarityKey, string> = {
  COMMON: "bg-zinc-400",
  UNCOMMON: "bg-green-500",
  RARE: "bg-blue-500",
  EPIC: "bg-purple-500",
  LEGENDARY: "bg-yellow-500",
  MYTHIC: "bg-pink-500",
};

function getRarityKey(rarity: string): RarityKey {
  const upper = rarity.toUpperCase();
  if (
    upper === "COMMON" ||
    upper === "UNCOMMON" ||
    upper === "RARE" ||
    upper === "EPIC" ||
    upper === "LEGENDARY" ||
    upper === "MYTHIC"
  ) {
    return upper;
  }
  return "COMMON";
}

// ─── CardThumbnail ────────────────────────────────────────────────────────────

export function CardThumbnail({
  id,
  name,
  rarity,
  imageUrl,
  minted,
  supplyCap,
}: CardData) {
  const rarityKey = getRarityKey(rarity);
  const badgeClass = RARITY_BADGE_CLASS[rarityKey];
  const glowClass = RARITY_GLOW_CLASS[rarityKey];
  const barClass = RARITY_BAR_CLASS[rarityKey];
  const rarityLabel = RARITY_LABEL[rarityKey];

  const supplyPct =
    supplyCap > 0 ? Math.min(100, Math.round((minted / supplyCap) * 100)) : 0;

  return (
    <Link
      href={`/cards/${id}`}
      aria-label={`View ${name} — ${rarityLabel} card`}
      className={[
        "group relative flex flex-col overflow-hidden rounded-xl",
        "border border-stroke-base bg-surface-card",
        "transition-all duration-300",
        glowClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
      ].join(" ")}
    >
      <article>
        {/* ── Art panel (~60% height) ── */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-elevated">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${name} card art`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {/* Decorative placeholder */}
              <svg
                viewBox="0 0 80 80"
                fill="none"
                aria-hidden="true"
                className="h-16 w-16 text-content-muted opacity-30"
              >
                <rect
                  x="8"
                  y="8"
                  width="64"
                  height="64"
                  rx="8"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 56l20-20 12 12 16-20 16 28"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}

          {/* Rarity badge overlay */}
          <span
            className={[
              "absolute left-2 top-2 rounded-full border px-2 py-0.5",
              "font-display text-[10px] font-semibold uppercase tracking-widest",
              badgeClass,
            ].join(" ")}
          >
            {rarityLabel}
          </span>
        </div>

        {/* ── Info panel ── */}
        <div className="flex flex-col gap-2 p-3">
          {/* Card name */}
          <h3 className="line-clamp-1 font-display text-sm font-semibold text-content-primary">
            {name}
          </h3>

          {/* Supply meter */}
          <div className="space-y-1">
            <div
              role="progressbar"
              aria-label={`${minted} of ${supplyCap} minted`}
              aria-valuenow={minted}
              aria-valuemin={0}
              aria-valuemax={supplyCap}
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay"
            >
              <div
                className={[
                  "h-full rounded-full transition-all",
                  barClass,
                ].join(" ")}
                style={{ width: `${supplyPct}%` }}
              />
            </div>
            <p className="font-body text-[10px] text-content-muted">
              {minted.toLocaleString()} / {supplyCap.toLocaleString()} minted
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
