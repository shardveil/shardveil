import { type Metadata } from "next";

import { CTAFooter } from "@/components/marketing/CTAFooter";
import { FeatureHighlight } from "@/components/marketing/FeatureHighlight";
import { Hero } from "@/components/marketing/Hero";
import { LiveStats } from "@/components/marketing/LiveStats";
import { TokenEconomy } from "@/components/marketing/TokenEconomy";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shardveil.xyz";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "ShardVeil — Collect the Shards. Pierce the Veil.",
  description:
    "Dark fantasy NFT card game on Arbitrum. Verifiable gacha, commit-reveal battles, bonding curve AMM.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "ShardVeil",
    description:
      "Dark fantasy NFT card game on Arbitrum. Verifiable gacha, commit-reveal battles, bonding curve AMM.",
    type: "website",
    images: [`${BASE_URL}/api/og/landing`],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${BASE_URL}/api/og/landing`],
  },
};

// ─── JSON-LD structured data ──────────────────────────────────────────────────

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#org`,
      name: "ShardVeil",
      url: BASE_URL,
      description: "Dark fantasy NFT card game on Arbitrum",
      sameAs: ["https://twitter.com/shardveil", "https://discord.gg/shardveil"],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "ShardVeil",
      publisher: { "@id": `${BASE_URL}/#org` },
    },
  ],
};

// ─── LandingPage ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <FeatureHighlight />
      <LiveStats />
      <TokenEconomy />
      <CTAFooter />
    </>
  );
}
