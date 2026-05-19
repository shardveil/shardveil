import { type Metadata } from "next";

import { CTAFooter } from "@/components/marketing/CTAFooter";
import { FeatureHighlight } from "@/components/marketing/FeatureHighlight";
import { Hero } from "@/components/marketing/Hero";
import { LiveStats } from "@/components/marketing/LiveStats";
import { TokenEconomy } from "@/components/marketing/TokenEconomy";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "ShardVeil — Collect the Shards. Pierce the Veil.",
  description:
    "Dark fantasy NFT card game on Arbitrum. Verifiable gacha, commit-reveal battles, bonding curve AMM.",
  openGraph: {
    title: "ShardVeil",
    description:
      "Dark fantasy NFT card game on Arbitrum. Verifiable gacha, commit-reveal battles, bonding curve AMM.",
    type: "website",
  },
};

// ─── LandingPage ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureHighlight />
      <LiveStats />
      <TokenEconomy />
      <CTAFooter />
    </>
  );
}
