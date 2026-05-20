import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { OG_COLORS, OG_HEIGHT, OG_RARITY_COLORS, OG_WIDTH } from "@/lib/og";

// ─── API ──────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardDetail {
  id: number;
  name: string;
  rarity: string;
  imageUrl: string | null;
  minted: string | number;
  supplyCap: string | number;
  power?: number;
  lore?: string;
}

interface ProfileStats {
  battlesWon: number;
  battlesLost: number;
  winRate: number;
  currentRank: string;
  cardsOwned: number;
}

interface ProfileApiResponse {
  address: string;
  username?: string;
  bio?: string;
  avatarUrl?: string | null;
  isPrivate: boolean;
  stats?: ProfileStats;
}

// ─── Cache headers ────────────────────────────────────────────────────────────

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=86400",
};

// ─── Shared image options ─────────────────────────────────────────────────────

const IMAGE_OPTIONS = {
  width: OG_WIDTH,
  height: OG_HEIGHT,
  headers: CACHE_HEADERS,
};

// ─── Fallback layout ─────────────────────────────────────────────────────────

function FallbackOG() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.bg,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Decorative top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(to right, ${OG_COLORS.veil}, ${OG_COLORS.pink})`,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: OG_COLORS.veil,
            letterSpacing: "-2px",
          }}
        >
          ShardVeil
        </div>
        <div
          style={{
            fontSize: 28,
            color: OG_COLORS.muted,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          Dark Fantasy NFT Card Game
        </div>
      </div>
    </div>
  );
}

// ─── Landing OG ──────────────────────────────────────────────────────────────

function LandingOG() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(to right, ${OG_COLORS.veil}, ${OG_COLORS.pink})`,
          display: "flex",
        }}
      />

      {/* Decorative geometric shapes */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 80,
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: `2px solid ${OG_COLORS.border}`,
          opacity: 0.4,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 120,
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `2px solid ${OG_COLORS.veil}`,
          opacity: 0.3,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 60,
          width: 160,
          height: 160,
          borderRadius: "50%",
          border: `2px solid ${OG_COLORS.border}`,
          opacity: 0.3,
          display: "flex",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 24,
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: OG_COLORS.veil,
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          ShardVeil
        </div>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 2,
            backgroundColor: OG_COLORS.border,
            display: "flex",
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: OG_COLORS.text,
            fontWeight: 300,
            letterSpacing: "1px",
            textAlign: "center",
          }}
        >
          Collect the Shards. Pierce the Veil.
        </div>

        {/* URL hint */}
        <div
          style={{
            marginTop: 16,
            fontSize: 18,
            color: OG_COLORS.muted,
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          shardveil.xyz
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          height: 8,
          background: `linear-gradient(to right, ${OG_COLORS.veil}33, ${OG_COLORS.veil}, ${OG_COLORS.pink}, ${OG_COLORS.pink}33)`,
          display: "flex",
        }}
      />
    </div>
  );
}

// ─── Card OG ─────────────────────────────────────────────────────────────────

function CardOG({ card }: { card: CardDetail }) {
  const rarityColor = OG_RARITY_COLORS[card.rarity] ?? OG_COLORS.muted;
  const rarityLabel =
    card.rarity.charAt(0) + card.rarity.slice(1).toLowerCase();
  const minted = Number(card.minted).toLocaleString();
  const supplyCap = Number(card.supplyCap).toLocaleString();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Left: Card art panel (~40%) */}
      <div
        style={{
          display: "flex",
          width: "40%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          backgroundColor: OG_COLORS.surface,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          /* Placeholder when no image */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                backgroundColor: rarityColor + "33",
                border: `2px solid ${rarityColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  color: rarityColor,
                }}
              >
                ✦
              </div>
            </div>
            <div style={{ fontSize: 14, color: OG_COLORS.muted }}>No Image</div>
          </div>
        )}

        {/* Rarity gradient overlay at bottom of art */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: `linear-gradient(to top, ${OG_COLORS.bg}, transparent)`,
            display: "flex",
          }}
        />
      </div>

      {/* Right: Card info (~60%) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 56px",
          gap: 24,
          justifyContent: "center",
        }}
      >
        {/* Brand */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: OG_COLORS.veil,
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          ShardVeil
        </div>

        {/* Card name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: OG_COLORS.text,
            lineHeight: 1.1,
            letterSpacing: "-1px",
          }}
        >
          {card.name}
        </div>

        {/* Rarity badge */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 6,
              paddingBottom: 6,
              borderRadius: 20,
              backgroundColor: rarityColor + "22",
              border: `1px solid ${rarityColor}66`,
              fontSize: 14,
              fontWeight: 700,
              color: rarityColor,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {rarityLabel}
          </div>
        </div>

        {/* Supply */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: OG_COLORS.muted,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Supply
          </div>
          <div style={{ fontSize: 24, color: OG_COLORS.text, fontWeight: 600 }}>
            {minted} / {supplyCap} minted
          </div>
        </div>

        {/* Power (if present) */}
        {card.power !== undefined && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: OG_COLORS.muted,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Power
            </div>
            <div
              style={{ fontSize: 24, color: OG_COLORS.gold, fontWeight: 700 }}
            >
              {card.power}
            </div>
          </div>
        )}
      </div>

      {/* Bottom strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: `linear-gradient(to right, ${OG_COLORS.veil}33, ${OG_COLORS.veil}, ${rarityColor}, ${rarityColor}33)`,
          display: "flex",
        }}
      />
    </div>
  );
}

// ─── Profile OG ──────────────────────────────────────────────────────────────

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ProfileOG({ profile }: { profile: ProfileApiResponse }) {
  const displayName = profile.username ?? truncateAddress(profile.address);
  const initials = profile.username
    ? profile.username.slice(0, 2).toUpperCase()
    : profile.address.slice(2, 4).toUpperCase();
  const bio = profile.bio
    ? profile.bio.slice(0, 80) + (profile.bio.length > 80 ? "…" : "")
    : null;

  const winRate = profile.stats?.winRate ?? 0;
  const rank = profile.stats?.currentRank ?? "—";
  const cardsOwned = profile.stats?.cardsOwned ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(to right, ${OG_COLORS.veil}, ${OG_COLORS.pink})`,
          display: "flex",
        }}
      />

      {/* Main content row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          alignItems: "center",
          padding: "48px 64px",
          gap: 48,
        }}
      >
        {/* Left: Avatar */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
          }}
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                objectFit: "cover",
                border: `3px solid ${OG_COLORS.veil}`,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 140,
                height: 140,
                borderRadius: "50%",
                backgroundColor: OG_COLORS.veil + "33",
                border: `3px solid ${OG_COLORS.veil}`,
                fontSize: 48,
                fontWeight: 800,
                color: OG_COLORS.veil,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Center: Name + bio */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: OG_COLORS.text,
              lineHeight: 1.1,
            }}
          >
            {displayName}
          </div>
          {bio && (
            <div
              style={{
                fontSize: 20,
                color: OG_COLORS.muted,
                lineHeight: 1.4,
              }}
            >
              {bio}
            </div>
          )}
        </div>

        {/* Right: Stats box */}
        {profile.stats && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "24px 32px",
              border: `1px solid ${OG_COLORS.border}`,
              borderRadius: 12,
              backgroundColor: OG_COLORS.surface,
              flexShrink: 0,
              minWidth: 200,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  color: OG_COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Win Rate
              </div>
              <div
                style={{ fontSize: 28, fontWeight: 700, color: OG_COLORS.gold }}
              >
                {winRate.toFixed(1)}%
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  color: OG_COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Rank
              </div>
              <div
                style={{ fontSize: 20, fontWeight: 600, color: OG_COLORS.veil }}
              >
                {rank}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  fontSize: 12,
                  color: OG_COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Cards Owned
              </div>
              <div
                style={{ fontSize: 20, fontWeight: 600, color: OG_COLORS.text }}
              >
                {cardsOwned.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom branding */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 64px 24px",
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: OG_COLORS.veil,
            fontWeight: 600,
            letterSpacing: "2px",
          }}
        >
          SHARDVEIL
        </div>
        <div style={{ fontSize: 14, color: OG_COLORS.muted }}>
          shardveil.xyz
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          height: 8,
          background: `linear-gradient(to right, ${OG_COLORS.veil}33, ${OG_COLORS.veil}, ${OG_COLORS.pink}, ${OG_COLORS.pink}33)`,
          display: "flex",
        }}
      />
    </div>
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const [type, id] = slug;

  // ── Landing ──────────────────────────────────────────────────────────────
  if (type === "landing") {
    return new ImageResponse(<LandingOG />, IMAGE_OPTIONS);
  }

  // ── Card ─────────────────────────────────────────────────────────────────
  if (type === "card" && id) {
    try {
      const res = await fetch(`${API_URL}/cards/${id}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const card = (await res.json()) as CardDetail;
        return new ImageResponse(<CardOG card={card} />, IMAGE_OPTIONS);
      }
    } catch {
      // fall through to fallback
    }
    return new ImageResponse(<FallbackOG />, IMAGE_OPTIONS);
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  if (type === "profile" && id) {
    try {
      const res = await fetch(`${API_URL}/profile/${id}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const profile = (await res.json()) as ProfileApiResponse;
        return new ImageResponse(
          <ProfileOG profile={profile} />,
          IMAGE_OPTIONS,
        );
      }
    } catch {
      // fall through to fallback
    }
    return new ImageResponse(<FallbackOG />, IMAGE_OPTIONS);
  }

  // ── Unknown slug → generic fallback ──────────────────────────────────────
  return new ImageResponse(<FallbackOG />, IMAGE_OPTIONS);
}
