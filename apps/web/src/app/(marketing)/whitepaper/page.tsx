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
    content: `ShardVeil is a dark fantasy NFT card game deployed on Arbitrum Sepolia — a provably fair, fully on-chain collectible card experience where every pack opening, battle outcome, and marketplace transaction is cryptographically verifiable. The protocol combines verifiable random function (VRF) gacha mechanics, commit-reveal battle resolution, and a dual-token bonding curve economy to create a game that is simultaneously fun to play and impossible to rig.

Unlike traditional Web2 card games, ShardVeil players retain true ownership of every card they collect. Cards are ERC-1155 tokens, meaning they can be freely traded, fractionalised, or used as collateral — entirely independent of the ShardVeil platform itself. The game is designed to remain playable even if the development team disappears, because all core logic lives on-chain.

This whitepaper describes the complete technical and economic architecture of ShardVeil v1. It is intended for players, collectors, investors, and developers who want to understand how every system in the protocol works from first principles.`,
  },
  {
    id: "core-mechanics",
    level: 1,
    title: "Core Mechanics",
    content: `ShardVeil gameplay is built around three interlocking pillars: Collection, Battle, and Economy. Each pillar is designed to reinforce the others in a sustainable loop — players collect cards to battle, battles reward tokens, and tokens are used to collect more cards or participate in governance.

Every interaction with the protocol emits on-chain events that third-party indexers and analytics platforms can consume without permission. The game state is fully reconstructable from chain data alone, ensuring long-term transparency and auditability.`,
  },
  {
    id: "card-system",
    level: 1,
    title: "Card System",
    content: `Cards are the fundamental unit of ShardVeil. Each card is an ERC-1155 token with a fixed tokenId that encodes its rarity tier, archetype, and edition number. Card metadata is stored on IPFS with the content hash anchored on-chain to prevent tampering.

There are six rarity tiers, each with a distinct drop rate and base power level: Common (55.0%), Uncommon (25.0%), Rare (12.0%), Epic (6.0%), Legendary (1.8%), and Mythic (0.2%).

Each card belongs to one of five archetypes: Veilborn (shadow mages), Shardbound (crystal warriors), Dreadhollow (undead horrors), Runecallers (arcane scholars), and Ironpact (armored covenants). Archetype synergies unlock bonus effects when specific combinations are played together in a single hand.`,
  },
  {
    id: "gacha-vrf",
    level: 1,
    title: "Gacha & Verifiable Randomness",
    content: `Pack opening in ShardVeil uses Chainlink VRF v2.5 to generate tamper-proof randomness. When a player requests a pack, the contract emits a RandomnessRequested event and enters a pending state. Chainlink nodes respond with a VRF proof that the contract verifies on-chain before using the random seed to determine card outcomes.

This two-step flow (request to fulfill) means no one — including the ShardVeil team — can predict or influence card outcomes after a pack is requested. The randomness seed, VRF proof, and resulting card assignments are all available on-chain for anyone to verify independently.`,
  },
  {
    id: "pity-system",
    level: 2,
    title: "Pity System",
    content: `To protect players from extreme bad luck, the protocol includes an on-chain pity counter. Each wallet address maintains a counter that increments with every pack opened. If a player opens 50 packs without receiving a Legendary or higher, the 51st pack is guaranteed to contain at least one Legendary card. The Mythic pity threshold is set at 200 packs.

Pity counters are stored in contract storage (not off-chain), so they persist across wallets and cannot be reset by the team. They are also publicly readable, giving players full visibility into their current pity state at all times.`,
  },
  {
    id: "battle-engine",
    level: 1,
    title: "Battle Engine",
    content: `Battles between two players are resolved via a commit-reveal scheme that prevents front-running and hand peeking. The flow has three phases.

Commit — Each player submits a hash of their chosen hand (cards + salt). Neither player's hand is visible on-chain at this point.

Reveal — Both players submit their plaintext hand and salt within the reveal window. The contract verifies the hash matches and records both hands.

Resolution — The contract applies game rules deterministically to determine the winner. $SHARD rewards are distributed immediately, and the result is emitted as a BattleResolved event.

If a player fails to reveal within the reveal window (currently 256 blocks), they forfeit the match and their staked entry fee is awarded to the opponent. This design makes griefing economically irrational.`,
  },
  {
    id: "token-economy",
    level: 1,
    title: "Token Economy",
    content: `ShardVeil uses a dual-token model to separate governance rights from in-game economic activity. The two tokens have distinct emission schedules, use cases, and economic properties designed to remain complementary rather than competitive.`,
  },
  {
    id: "veil-token",
    level: 2,
    title: "$VEIL — Governance Token",
    content: `$VEIL is the governance and fee-capture token of the ShardVeil protocol. It has a hard cap of 1,000,000,000 VEIL and will never be re-minted once the cap is reached. The initial distribution is: 40% community treasury, 20% team and contributors (4-year vesting, 1-year cliff), 15% ecosystem fund, 15% public sale, and 10% initial liquidity and market making.

$VEIL holders can stake their tokens to receive a proportional share of protocol revenue, including pack opening fees, marketplace royalties, and battle entry fees. Stakers also gain voting rights in the governance module, with one staked VEIL equal to one vote.`,
  },
  {
    id: "shard-token",
    level: 2,
    title: "$SHARD — Ecosystem Token",
    content: `$SHARD is the inflationary-but-deflationary in-game currency. It is earned through gameplay (battles, daily quests, seasonal rewards) and burned through economic activity (card crafting, pack upgrades, marketplace listings). The emission and burn rates are parameterised through governance, allowing the $VEIL community to maintain long-term price stability without hard-coding artificial limits.

$SHARD supply is managed by a bonding curve automated market maker (AMM) that sits between the protocol treasury and the open market. When protocol revenue exceeds target thresholds, excess $SHARD is bought back and burned. When supply falls below circulation targets, the treasury mints additional $SHARD and sells it into the bonding curve at a controlled rate.`,
  },
  {
    id: "governance",
    level: 1,
    title: "Governance",
    content: `ShardVeil is governed by $VEIL stakers through an on-chain governor contract. Any staker with at least 10,000 VEIL (or delegation from stakers totalling that amount) can submit a governance proposal. Proposals pass with a simple majority after a 5-day voting window and a 2-day timelock before execution.

The governance module can control: emission rate adjustments, pity threshold changes, new archetype introductions, marketplace fee updates, treasury grant approvals, and contract upgrades. Certain critical parameters (e.g., total supply cap, core VRF integration) are immutable and cannot be altered through governance to protect players from malicious proposals.

Governance decisions are recorded on-chain and the governor contract enforces them automatically, removing the need to trust the development team to implement voter wishes correctly.`,
  },
  {
    id: "technical-architecture",
    level: 1,
    title: "Technical Architecture",
    content: `ShardVeil is deployed on Arbitrum Sepolia (testnet) with a planned mainnet migration to Arbitrum One upon audit completion. The smart contract stack is written in Solidity 0.8.x and uses the following primary contracts: ShardVeilCards.sol (ERC-1155 card NFT, minting restricted to the Gacha contract), GachaVRF.sol (pack opening logic, VRF consumer, pity counter storage), BattleArena.sol (commit-reveal battle engine with entry fee staking), VeilToken.sol (ERC-20 governance token with fixed supply), ShardToken.sol (ERC-20 ecosystem token with bonding curve AMM integration), and ShardVeilGovernor.sol (OpenZeppelin Governor with timelock controller).

The frontend is built with Next.js 14 (App Router), wagmi v2, and viem. Off-chain indexing is handled by a Graph Protocol subgraph that tracks all relevant contract events and exposes a GraphQL API for the game UI and third-party dashboards.`,
  },
  {
    id: "roadmap",
    level: 1,
    title: "Roadmap",
    content: `The ShardVeil development roadmap is divided into four phases. Each phase gate requires a successful security audit and community governance approval before proceeding.

Phase I — Foundation (Complete): Core contracts deployed on Arbitrum Sepolia. VRF gacha, commit-reveal battle engine, dual-token economy. Public testnet open.

Phase II — Ecosystem (In Progress): Governance module launch. Marketplace with bonding curve AMM. Card crafting and upgrade system. First seasonal card set.

Phase III — Growth (Q3 2026): Mainnet migration to Arbitrum One. Cross-chain card bridging via LayerZero. Guild system and tournament infrastructure. Mobile-first UI overhaul.

Phase IV — Endgame (Q1 2027): Full DAO handoff — development team relinquishes admin keys. Permissionless card creator SDK. Cross-game card compatibility standard proposal to EIP committee.`,
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
