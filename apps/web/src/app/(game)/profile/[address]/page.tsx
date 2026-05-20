import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import {
  type ProfileApiResponse,
  PublicProfile,
} from "@/components/profile/PublicProfile";
import { truncateAddress } from "@/lib/format";

// ─── Revalidation ─────────────────────────────────────────────────────────────

export const revalidate = 300;

// ─── API ──────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Data fetching ────────────────────────────────────────────────────────────

const fetchProfile = cache(
  async (address: string): Promise<ProfileApiResponse | null> => {
    try {
      const res = await fetch(`${API_URL}/profile/${address}`, {
        next: { revalidate: 300 },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return (await res.json()) as ProfileApiResponse;
    } catch {
      return null;
    }
  },
);

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ address: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { address } = await params;
  const profile = await fetchProfile(address);

  if (!profile) {
    return { title: "Profile Not Found | ShardVeil" };
  }

  const displayName = profile.username ?? truncateAddress(profile.address);

  return {
    title: `${displayName} | ShardVeil Profile`,
    description: profile.bio
      ? profile.bio.slice(0, 155).replace(/\n/g, " ")
      : `View ${displayName}'s ShardVeil profile.`,
    openGraph: {
      title: `${displayName} | ShardVeil Profile`,
      description: `View ${displayName}'s ShardVeil profile.`,
      ...(profile.avatarUrl ? { images: [profile.avatarUrl] } : {}),
      type: "profile",
    },
  };
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default async function ProfilePage({ params }: PageProps) {
  const { address } = await params;
  const profile = await fetchProfile(address);

  if (!profile) {
    notFound();
  }

  return <PublicProfile profile={profile} />;
}
