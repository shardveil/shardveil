---
type: "query"
date: "2026-08-12T15:54:22.634636+00:00"
question: "Why does getAddresses() connect Contract ABIs and Addresses to Card Catalog Service, Chain Indexer and Backfill, Tournament Engine, XP and Activity Workers?"
contributor: "graphify"
source_nodes:
  [
    "getAddresses()",
    "addresses.ts",
    "SupportedChainId",
    "adminGuard.ts",
    "viem.ts",
  ]
---

# Q: Why does getAddresses() connect Contract ABIs and Addresses to Card Catalog Service, Chain Indexer and Backfill, Tournament Engine, XP and Activity Workers?

## Answer

Expanded from original query via vocab: [addresses, address, contract, abi, abis, get, catalog, card, chain, indexer, tournament, activity, worker, registry]. Then traversed getAddresses() (packages/contracts/src/addresses.ts:14) directly, because the CLI substring matcher anchored on 'worker' instead. getAddresses() is a one-line accessor returning addresses[chainId], re-exported from packages/contracts/src/index.ts:16, and it is the only sanctioned way to reach a deployed contract address. That is why it bridges communities: grep confirms 14 call sites spanning every layer - config/viem.ts:163, middleware/adminGuard.ts (10 calls, lines 29-65, one per contract role), services/cardService.ts:370 and :513, services/tournamentService.ts:392, workers/settlementSigner.ts:63, workers/xpSigner.ts:127, workers/vrfWatcher.ts:36, workers/eventIndexer.ts:42, scripts/indexer-backfill.ts:206, scripts/indexer-replay.ts:184, and index.ts:29. The graph tagged those edges INFERRED (0.8); grep verifies every one, so the bridge is real, not an extraction artifact. The structural finding is what the fan-out hides: SupportedChainId is declared as typeof ARBITRUM_SEPOLIA_CHAIN_ID alone (addresses.ts:7), so getAddresses only accepts testnet, and all 14 call sites pass the literal ARBITRUM_SEPOLIA_CHAIN_ID rather than a configured chain id. The ARBITRUM_ONE map exists in the same file but is all-null stubs marked 'filled in Phase K (mainnet launch)' and is unreachable through the typed accessor. So the chain is hardcoded at 14 sites instead of resolved once from config, and mainnet launch is a 14-file change plus a type widening, not a config flip.

## Source Nodes

- getAddresses()
- addresses.ts
- SupportedChainId
- adminGuard.ts
- viem.ts
