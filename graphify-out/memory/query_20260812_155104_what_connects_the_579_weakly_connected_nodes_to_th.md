---
type: "query"
date: "2026-08-12T15:51:04.021007+00:00"
question: "What connects the 579 weakly-connected nodes to the rest of the system?"
contributor: "graphify"
source_nodes:
  ["warOracleWallet", "clearActiveBattle", "viem.ts", "adminGuard.ts"]
---

# Q: What connects the 579 weakly-connected nodes to the rest of the system?

## Answer

Mostly nothing is wrong: of 738 degree<=1 nodes, the majority are TypeScript type-only declarations (interfaces, type aliases, Zod schemas) that the AST extractor does not link, plus Next.js framework entry points (page/layout/route/robots/sitemap exports) and worker main() functions that the framework invokes rather than code. Verified by grep that intra-file helper calls (applyPrivacyRules profile.ts:124, isRawHex adminGuard.ts:211, resolveRoleHash adminGuard.ts:223, createPrismaClient database.ts:54, CrystalIcon cards/page.tsx:178) are real calls the graph missed, so the weak-node count is largely an extraction artifact, not dead code. Two genuine findings survived verification: (1) clearActiveBattle (apps/api/src/ws/channels/battleChannel.ts:437) is exported and has zero callers anywhere in the repo - actually dead. (2) The guild war oracle path is unimplemented: warOracleWallet (apps/api/src/config/viem.ts:91) is never called by any production code, its only reference is a vi.fn() mock in apps/api/test/helpers/setup.ts:34, yet WAR_ORACLE_PRIVATE_KEY is validated in env.ts:52, redacted in logger.ts:29, provisioned as a sync:false secret in render.yaml:70, and WAR_ORACLE_ROLE exists on the GuildSystem contract (packages/contracts/src/abis/guildSystem.ts:808). The other three oracles all have real callers - settlerWallet in workers/settlementSigner.ts:173, xpOracleWallet in workers/xpSigner.ts:150, tournamentOracleWallet in services/tournamentService.ts:400 - so guild wars are the missing fourth signer path.

## Source Nodes

- warOracleWallet
- clearActiveBattle
- viem.ts
- adminGuard.ts
