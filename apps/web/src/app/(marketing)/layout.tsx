import { type Metadata } from "next";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

// ─── SEO defaults ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: { default: "ShardVeil", template: "%s | ShardVeil" },
  description:
    "Collect the Shards. Pierce the Veil. Dark fantasy NFT card game on Arbitrum.",
};

// ─── MarketingLayout ──────────────────────────────────────────────────────────

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  );
}
