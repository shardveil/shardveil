"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Coins, CreditCard, Layers, Shield, Swords } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { formatUnits } from "viem";

import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import { useShardTokenRead } from "@/hooks/contracts/useShardToken";
import { useVeilTokenRead } from "@/hooks/contracts/useVeilToken";
import { useApi } from "@/hooks/useApi";
import { useWs } from "@/hooks/useWs";
import { qk } from "@/lib/queryKeys";
import { useAuthStore } from "@/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileMe {
  username: string;
  avatarUrl: string | null;
  rank: string;
  cardsOwned: number;
  battlesPlayed: number;
}

interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(value: bigint | undefined): string {
  if (value === undefined) return "—";
  return parseFloat(formatUnits(value, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── DashboardSkeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome card skeleton */}
      <Skeleton className="h-28 w-full rounded-lg" />
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Quick actions skeleton */}
      <div className="space-y-2">
        <SkeletonText className="w-32 h-5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Activity skeleton */}
      <div className="space-y-2">
        <SkeletonText className="w-40 h-5" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed() {
  const { data, isLoading, isError } = useApi<ActivityEntry[]>(
    "/activity/feed?limit=5",
    { queryKey: ["activity", "feed"] },
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <p className="text-content-muted text-sm py-4 text-center">
        No activity yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-stroke-base">
      {data.map((entry) => (
        <li
          key={entry.id}
          className="py-3 flex items-start justify-between gap-4"
        >
          <p className="text-sm text-content-secondary font-body leading-snug flex-1 min-w-0 truncate">
            {entry.description}
          </p>
          <time
            dateTime={entry.createdAt}
            className="text-xs text-content-muted whitespace-nowrap shrink-0"
          >
            {new Date(entry.createdAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

// ─── DashboardContent ─────────────────────────────────────────────────────────

function DashboardContent() {
  const address = useAuthStore((s) => s.address);
  const queryClient = useQueryClient();
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  // Profile
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useApi<ProfileMe>("/profile/me", { queryKey: qk.profile.me() });

  // VEIL balance
  const veilArgs = address ? ([address as `0x${string}`] as const) : undefined;
  const { data: veilBalance, isLoading: veilLoading } = useVeilTokenRead(
    veilArgs
      ? { functionName: "balanceOf", args: veilArgs, enabled: true }
      : { functionName: "balanceOf", enabled: false },
  );

  // SHARD balance
  const shardArgs = address ? ([address as `0x${string}`] as const) : undefined;
  const { data: shardBalance, isLoading: shardLoading } = useShardTokenRead(
    shardArgs
      ? { functionName: "balanceOf", args: shardArgs, enabled: true }
      : { functionName: "balanceOf", enabled: false },
  );

  // Live balance updates via WS notifications
  const wsHandler = useCallback(() => {
    // Invalidate activity and refetch balances on any notification
    void queryClient.invalidateQueries({ queryKey: ["activity", "feed"] });
    setBalanceRefreshKey((k) => k + 1);
  }, [queryClient]);
  useWs("notification", wsHandler);

  const isNewPlayer =
    !profileLoading &&
    !profileError &&
    profile !== undefined &&
    profile.cardsOwned === 0 &&
    profile.battlesPlayed === 0;

  if (profileLoading || veilLoading || shardLoading) {
    return <DashboardSkeleton />;
  }

  if (profileError || !profile) {
    return (
      <EmptyState
        title="Unable to load profile"
        description="There was a problem fetching your data. Please refresh."
      />
    );
  }

  return (
    <div className="space-y-6" key={balanceRefreshKey}>
      {/* Welcome card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-content-primary leading-tight animate-page-fade-in">
            Welcome, {profile.username}
          </h1>
          <p className="font-body text-sm text-content-muted mt-1">
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""}
          </p>
        </div>
        <Badge
          variant="default"
          className="self-start sm:self-auto text-sm px-3 py-1"
        >
          <Shield className="h-3.5 w-3.5 mr-1 inline" />
          {profile.rank}
        </Badge>
      </Card>

      {/* New player empty state CTA */}
      {isNewPlayer && (
        <EmptyState
          title="Your adventure starts here"
          description="You don't have any cards yet. Open your first pack to begin building your deck."
          icon={<Layers className="h-12 w-12" />}
          action={{
            label: "Open your first pack",
            onClick: () => {
              window.location.href = "/pack";
            },
          }}
        />
      )}

      {/* Stats grid */}
      {!isNewPlayer && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="$VEIL Balance"
            value={formatBalance(veilBalance as bigint | undefined)}
            icon={<Coins className="h-4 w-4" />}
          />
          <StatCard
            label="$SHARD Balance"
            value={formatBalance(shardBalance as bigint | undefined)}
            icon={<Coins className="h-4 w-4" />}
          />
          <StatCard
            label="Rank"
            value={profile.rank}
            icon={<Shield className="h-4 w-4" />}
          />
          <StatCard
            label="Cards Owned"
            value={profile.cardsOwned}
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard
            label="Battles Played"
            value={profile.battlesPlayed}
            icon={<Swords className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Quick actions */}
      <section>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-content-muted mb-3">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-content-muted">
            Recent Activity
          </h2>
          <Link
            href="/activity"
            className="text-xs text-veil-400 hover:text-veil-300 transition-colors font-body"
          >
            View all
          </Link>
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="px-4">
            <ActivityFeed />
          </div>
        </Card>
      </section>
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return <DashboardContent />;
}
