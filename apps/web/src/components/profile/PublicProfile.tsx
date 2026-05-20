import Image from "next/image";

import { ShowcaseGrid } from "@/components/profile/ShowcaseGrid";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { truncateAddress } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileApiResponse {
  address: string;
  username?: string;
  bio?: string;
  avatarUrl?: string | null;
  isPrivate: boolean;
  stats?: {
    battlesWon: number;
    battlesLost: number;
    winRate: number;
    currentRank: string;
    seasonExp: number;
    cardsOwned: number;
    guildName?: string;
  };
  showcase?: Array<{
    id: number;
    name: string;
    rarity: string;
    imageUrl: string | null;
    minted: number;
    supplyCap: number;
    power?: number;
  }>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  username,
  address,
}: {
  avatarUrl?: string | null;
  username?: string;
  address: string;
}) {
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : address.slice(2, 4).toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${username ?? truncateAddress(address)} avatar`}
        width={64}
        height={64}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-veil-800 flex items-center justify-center shrink-0">
      <span className="font-display text-lg font-semibold text-veil-400">
        {initials}
      </span>
    </div>
  );
}

// ─── PublicProfile ────────────────────────────────────────────────────────────

interface PublicProfileProps {
  profile: ProfileApiResponse;
}

export function PublicProfile({ profile }: PublicProfileProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── Top section: avatar + identity ── */}
      <div className="flex items-start gap-4 bg-surface-card rounded-2xl border border-stroke-base p-6">
        <Avatar
          {...(profile.avatarUrl !== undefined && {
            avatarUrl: profile.avatarUrl,
          })}
          {...(profile.username !== undefined && {
            username: profile.username,
          })}
          address={profile.address}
        />

        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="font-display text-2xl text-content-primary truncate">
            {profile.username ?? truncateAddress(profile.address)}
          </h1>
          <p className="font-body text-sm text-content-muted hover:text-content-secondary motion-safe:transition-colors motion-safe:duration-200">
            {truncateAddress(profile.address)}
          </p>
          {profile.bio && (
            <p className="font-body text-sm text-content-secondary mt-2">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* ── Privacy guard ── */}
      {profile.isPrivate && (
        <div className="bg-surface-card rounded-2xl border border-stroke-base p-6 text-center">
          <p className="font-body text-sm text-content-muted">
            This profile is private.
          </p>
        </div>
      )}

      {!profile.isPrivate && (
        <>
          {/* ── Stats ── */}
          <section aria-labelledby="stats-heading">
            <h2
              id="stats-heading"
              className="font-display text-lg text-content-primary mb-4"
            >
              Battle Statistics
            </h2>
            <StatsGrid
              {...(profile.stats !== undefined && { stats: profile.stats })}
            />
          </section>

          {/* ── Showcase ── */}
          <section aria-labelledby="showcase-heading">
            <h2
              id="showcase-heading"
              className="font-display text-lg text-content-primary mb-4"
            >
              Card Showcase
            </h2>
            <ShowcaseGrid cards={profile.showcase ?? []} />
          </section>
        </>
      )}
    </div>
  );
}
