import type { Metadata } from "next";

import type { WhitepaperSection } from "@/components/marketing/Whitepaper/Section";
import { Section } from "@/components/marketing/Whitepaper/Section";
import { TableOfContents } from "@/components/marketing/Whitepaper/TableOfContents";

// ─── SEO metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Whitepaper",
  description:
    "The ShardVeil protocol whitepaper — a complete technical and economic specification of the dark fantasy NFT card game on Arbitrum Sepolia.",
  openGraph: {
    title: "ShardVeil Whitepaper",
    description:
      "Complete technical and economic specification of the ShardVeil protocol — verifiable gacha, commit-reveal battles, bonding curve AMM, and on-chain governance.",
    type: "article",
  },
};

// ─── Whitepaper content ───────────────────────────────────────────────────────

const WHITEPAPER_SECTIONS: WhitepaperSection[] = [
  {
    id: "overview",
    level: 1,
    title: "Overview",
    content: `
      <p>ShardVeil is a dark fantasy NFT card game deployed on Arbitrum Sepolia — a provably fair, fully on-chain collectible card experience where every pack opening, battle outcome, and marketplace transaction is cryptographically verifiable. The protocol combines verifiable random function (VRF) gacha mechanics, commit-reveal battle resolution, and a dual-token bonding curve economy to create a game that is simultaneously fun to play and impossible to rig.</p>
      <p>Unlike traditional Web2 card games, ShardVeil players retain true ownership of every card they collect. Cards are ERC-1155 tokens, meaning they can be freely traded, fractionalised, or used as collateral — entirely independent of the ShardVeil platform itself. The game is designed to remain playable even if the development team disappears, because all core logic lives on-chain.</p>
      <p>This whitepaper describes the complete technical and economic architecture of ShardVeil v1. It is intended for players, collectors, investors, and developers who want to understand how every system in the protocol works from first principles.</p>
    `,
  },
  {
    id: "core-mechanics",
    level: 1,
    title: "Core Mechanics",
    content: `
      <p>ShardVeil gameplay is built around three interlocking pillars: <strong>Collection</strong>, <strong>Battle</strong>, and <strong>Economy</strong>. Each pillar is designed to reinforce the others in a sustainable loop — players collect cards to battle, battles reward tokens, and tokens are used to collect more cards or participate in governance.</p>
      <p>Every interaction with the protocol emits on-chain events that third-party indexers and analytics platforms can consume without permission. The game state is fully reconstructable from chain data alone, ensuring long-term transparency and auditability.</p>
    `,
  },
  {
    id: "card-system",
    level: 1,
    title: "Card System",
    content: `
      <p>Cards are the fundamental unit of ShardVeil. Each card is an ERC-1155 token with a fixed <code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">tokenId</code> that encodes its rarity tier, archetype, and edition number. Card metadata is stored on IPFS with the content hash anchored on-chain to prevent tampering.</p>
      <p>There are six rarity tiers, each with a distinct drop rate and base power level:</p>
      <ul class="list-none space-y-1 mt-3 mb-2">
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-content-muted">Common</span><span class="text-content-secondary">55.0% drop rate — the backbone of every collection</span></li>
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-green-400">Uncommon</span><span class="text-content-secondary">25.0% drop rate — meaningful power upgrades</span></li>
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-blue-400">Rare</span><span class="text-content-secondary">12.0% drop rate — battlefield anchors</span></li>
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-veil-300">Epic</span><span class="text-content-secondary">6.0% drop rate — game-defining abilities</span></li>
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-gold-400">Legendary</span><span class="text-content-secondary">1.8% drop rate — iconic, story-driven cards</span></li>
        <li class="flex items-center gap-2"><span class="w-24 text-sm font-mono text-mythic-300">Mythic</span><span class="text-content-secondary">0.2% drop rate — unique or near-unique shards of the Veil</span></li>
      </ul>
      <p>Each card belongs to one of five archetypes: <strong>Veilborn</strong> (shadow mages), <strong>Shardbound</strong> (crystal warriors), <strong>Dreadhollow</strong> (undead horrors), <strong>Runecallers</strong> (arcane scholars), and <strong>Ironpact</strong> (armored covenants). Archetype synergies unlock bonus effects when specific combinations are played together in a single hand.</p>
    `,
  },
  {
    id: "gacha-vrf",
    level: 1,
    title: "Gacha & Verifiable Randomness",
    content: `
      <p>Pack opening in ShardVeil uses Chainlink VRF v2.5 to generate tamper-proof randomness. When a player requests a pack, the contract emits a <code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">RandomnessRequested</code> event and enters a pending state. Chainlink nodes respond with a VRF proof that the contract verifies on-chain before using the random seed to determine card outcomes.</p>
      <p>This two-step flow (request → fulfill) means <em>no one</em> — including the ShardVeil team — can predict or influence card outcomes after a pack is requested. The randomness seed, VRF proof, and resulting card assignments are all available on-chain for anyone to verify independently.</p>
    `,
  },
  {
    id: "pity-system",
    level: 2,
    title: "Pity System",
    content: `
      <p>To protect players from extreme bad luck, the protocol includes an on-chain pity counter. Each wallet address maintains a counter that increments with every pack opened. If a player opens 50 packs without receiving a Legendary or higher, the 51st pack is guaranteed to contain at least one Legendary card. The Mythic pity threshold is set at 200 packs.</p>
      <p>Pity counters are stored in contract storage (not off-chain), so they persist across wallets and cannot be reset by the team. They are also publicly readable, giving players full visibility into their current pity state at all times.</p>
    `,
  },
  {
    id: "battle-engine",
    level: 1,
    title: "Battle Engine",
    content: `
      <p>Battles between two players are resolved via a commit-reveal scheme that prevents front-running and hand peeking. The flow has three phases:</p>
      <ol class="list-decimal list-inside space-y-2 mt-3 mb-2 text-content-secondary">
        <li><strong class="text-content-primary">Commit</strong> — Each player submits a hash of their chosen hand (cards + salt). Neither player's hand is visible on-chain at this point.</li>
        <li><strong class="text-content-primary">Reveal</strong> — Both players submit their plaintext hand and salt within the reveal window. The contract verifies the hash matches and records both hands.</li>
        <li><strong class="text-content-primary">Resolution</strong> — The contract applies game rules deterministically to determine the winner. $SHARD rewards are distributed immediately, and the result is emitted as a <code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">BattleResolved</code> event.</li>
      </ol>
      <p>If a player fails to reveal within the reveal window (currently 256 blocks), they forfeit the match and their staked entry fee is awarded to the opponent. This design makes griefing economically irrational.</p>
    `,
  },
  {
    id: "token-economy",
    level: 1,
    title: "Token Economy",
    content: `
      <p>ShardVeil uses a dual-token model to separate governance rights from in-game economic activity. The two tokens have distinct emission schedules, use cases, and economic properties designed to remain complementary rather than competitive.</p>
    `,
  },
  {
    id: "veil-token",
    level: 2,
    title: "$VEIL — Governance Token",
    content: `
      <p>$VEIL is the governance and fee-capture token of the ShardVeil protocol. It has a hard cap of <strong>1,000,000,000 VEIL</strong> and will never be re-minted once the cap is reached. The initial distribution is structured as follows:</p>
      <ul class="list-disc list-inside space-y-1 mt-2 mb-2 text-content-secondary">
        <li>40% — Community treasury (governed by $VEIL holders)</li>
        <li>20% — Team and contributors (4-year vesting, 1-year cliff)</li>
        <li>15% — Ecosystem fund (grants, integrations, hackathons)</li>
        <li>15% — Public sale</li>
        <li>10% — Initial liquidity and market making</li>
      </ul>
      <p>$VEIL holders can stake their tokens to receive a proportional share of protocol revenue, including pack opening fees, marketplace royalties, and battle entry fees. Stakers also gain voting rights in the governance module, with one staked VEIL equal to one vote.</p>
    `,
  },
  {
    id: "shard-token",
    level: 2,
    title: "$SHARD — Ecosystem Token",
    content: `
      <p>$SHARD is the inflationary-but-deflationary in-game currency. It is earned through gameplay (battles, daily quests, seasonal rewards) and burned through economic activity (card crafting, pack upgrades, marketplace listings). The emission and burn rates are parameterised through governance, allowing the $VEIL community to maintain long-term price stability without hard-coding artificial limits.</p>
      <p>$SHARD supply is managed by a bonding curve automated market maker (AMM) that sits between the protocol treasury and the open market. When protocol revenue exceeds target thresholds, excess $SHARD is bought back and burned. When supply falls below circulation targets, the treasury mints additional $SHARD and sells it into the bonding curve at a controlled rate.</p>
    `,
  },
  {
    id: "governance",
    level: 1,
    title: "Governance",
    content: `
      <p>ShardVeil is governed by $VEIL stakers through an on-chain governor contract. Any staker with at least 10,000 VEIL (or delegation from stakers totalling that amount) can submit a governance proposal. Proposals pass with a simple majority after a 5-day voting window and a 2-day timelock before execution.</p>
      <p>The governance module can control: emission rate adjustments, pity threshold changes, new archetype introductions, marketplace fee updates, treasury grant approvals, and contract upgrades. Certain critical parameters (e.g., total supply cap, core VRF integration) are immutable and cannot be altered through governance to protect players from malicious proposals.</p>
      <p>Governance decisions are recorded on-chain and the governor contract enforces them automatically, removing the need to trust the development team to implement voter wishes correctly.</p>
    `,
  },
  {
    id: "technical-architecture",
    level: 1,
    title: "Technical Architecture",
    content: `
      <p>ShardVeil is deployed on Arbitrum Sepolia (testnet) with a planned mainnet migration to Arbitrum One upon audit completion. The smart contract stack is written in Solidity 0.8.x and uses the following primary contracts:</p>
      <ul class="list-disc list-inside space-y-1 mt-2 mb-2 text-content-secondary">
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">ShardVeilCards.sol</code> — ERC-1155 card NFT contract with minting authority restricted to the Gacha contract</li>
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">GachaVRF.sol</code> — Pack opening logic, VRF consumer, and pity counter storage</li>
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">BattleArena.sol</code> — Commit-reveal battle engine with entry fee staking</li>
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">VeilToken.sol</code> — ERC-20 governance token with fixed supply</li>
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">ShardToken.sol</code> — ERC-20 ecosystem token with bonding curve AMM integration</li>
        <li><code class="px-1.5 py-0.5 rounded bg-veil-900/80 font-mono text-shard-300 text-sm">ShardVeilGovernor.sol</code> — OpenZeppelin Governor with timelock controller</li>
      </ul>
      <p>The frontend is built with Next.js 14 (App Router), wagmi v2, and viem. Off-chain indexing is handled by a Graph Protocol subgraph that tracks all relevant contract events and exposes a GraphQL API for the game UI and third-party dashboards.</p>
    `,
  },
  {
    id: "roadmap",
    level: 1,
    title: "Roadmap",
    content: `
      <p>The ShardVeil development roadmap is divided into four phases. Each phase gate requires a successful security audit and community governance approval before proceeding.</p>
      <ul class="list-none space-y-3 mt-3 text-content-secondary">
        <li class="flex gap-3"><span class="text-gold-400 font-display font-semibold shrink-0">Phase I</span><span><strong class="text-content-primary">Foundation (Complete)</strong> — Core contracts deployed on Arbitrum Sepolia. VRF gacha, commit-reveal battle engine, dual-token economy. Public testnet open.</span></li>
        <li class="flex gap-3"><span class="text-gold-400 font-display font-semibold shrink-0">Phase II</span><span><strong class="text-content-primary">Ecosystem (In Progress)</strong> — Governance module launch. Marketplace with bonding curve AMM. Card crafting and upgrade system. First seasonal card set.</span></li>
        <li class="flex gap-3"><span class="text-gold-400 font-display font-semibold shrink-0">Phase III</span><span><strong class="text-content-primary">Growth (Q3 2026)</strong> — Mainnet migration to Arbitrum One. Cross-chain card bridging via LayerZero. Guild system and tournament infrastructure. Mobile-first UI overhaul.</span></li>
        <li class="flex gap-3"><span class="text-gold-400 font-display font-semibold shrink-0">Phase IV</span><span><strong class="text-content-primary">Endgame (Q1 2027)</strong> — Full DAO handoff — development team relinquishes admin keys. Permissionless card creator SDK. Cross-game card compatibility standard proposal to EIP committee.</span></li>
      </ul>
    `,
  },
];

// ─── WhitepaperPage ───────────────────────────────────────────────────────────

export default function WhitepaperPage() {
  return (
    <div className="relative min-h-screen bg-surface-base">
      {/* Subtle background ambient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-veil-900/20 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gold-900/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* ── Page header ── */}
        <div className="mb-12 md:mb-16 max-w-2xl">
          <p className="mb-3 text-xs font-body font-semibold uppercase tracking-widest text-gold-400">
            Protocol Documentation
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-content-primary tracking-wide mb-4">
            ShardVeil Whitepaper
          </h1>
          <p className="font-body text-content-secondary leading-relaxed text-lg">
            A complete technical and economic specification of the ShardVeil
            protocol — verifiable gacha, commit-reveal battles, bonding curve
            AMM, and on-chain governance.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-body text-content-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke-base px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              Version 1.0
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke-base px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-shard-400" />
              Arbitrum Sepolia
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke-base px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-veil-400" />
              Dark Fantasy
            </span>
          </div>
        </div>

        {/* ── Two-column layout: TOC + content ── */}
        <div className="flex gap-12 xl:gap-16 items-start">
          {/* Left: sticky TOC (desktop only; mobile handled inside the component) */}
          <TableOfContents sections={WHITEPAPER_SECTIONS} />

          {/* Right: scrollable content */}
          <article className="flex-1 min-w-0">
            {WHITEPAPER_SECTIONS.map((section) => (
              <Section key={section.id} section={section} />
            ))}

            {/* Footer note */}
            <div className="mt-16 pt-8 border-t border-stroke-base">
              <p className="font-body text-sm text-content-muted leading-relaxed max-w-[65ch]">
                This whitepaper is a living document. Updates are proposed and
                ratified through on-chain governance. Check the{" "}
                <a
                  href="/roadmap"
                  className="text-gold-400 hover:text-gold-300 underline underline-offset-2 transition-colors"
                >
                  Roadmap
                </a>{" "}
                for the latest development status.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
