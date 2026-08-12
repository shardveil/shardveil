---
type: "query"
date: "2026-08-12T15:56:02.078410+00:00"
question: "Should Battle Engine and Timers, WebSocket Server and Routing, or Card Browsing Grid be split into smaller, more focused modules?"
contributor: "graphify"
source_nodes:
  [
    "queue.ts",
    "battleChannel.ts",
    "battleService.ts",
    "battleTimer.ts",
    "messageRouter.ts",
    "CardGrid.tsx",
  ]
---

# Q: Should Battle Engine and Timers, WebSocket Server and Routing, or Card Browsing Grid be split into smaller, more focused modules?

## Answer

Expanded from original query via vocab: [battle, engine, timer, socket, server, routing, card, grid, channel, queue, component, filter]. Answered by subgraph analysis of communities 0, 1 and 2 rather than CLI traversal. Verdict: no, none of the three should be split - the low cohesion scores are a size artifact, not a design smell. Cohesion here is edge density (internal edges over possible pairs), which falls off quadratically with node count, so the report's three worst-scoring communities are simply its three largest. Each one is a single connected component with no detachable sub-cluster. Community 0 Battle Engine and Timers: 61 nodes, 138 internal edges, density 0.075, spread over exactly 4 files - ws/channels/battleChannel.ts (25 nodes), services/battleService.ts (18), workers/battleTimer.ts (11), config/queue.ts (7). That is already the standard channel/service/worker split of one feature. Community 1 WebSocket Server and Routing: 45 nodes, 75 internal edges, density 0.076, over 8 files all under src/ws - presenceChannel.ts (16), messageRouter.ts (10), notificationChannel.ts (8), middleware/wsRateLimit.ts (6), plus single nodes from wsServer, battleChannel, chatChannel and wsAuth. It is the WS transport layer, already one directory. Community 2 Card Browsing Grid: 39 nodes, 50 internal edges, density 0.067, over 6 files - CardGrid.tsx (11), CardThumbnail.tsx (9), (marketing)/cards/page.tsx (8), CardFilters.tsx (6), ShowcaseGrid.tsx (3), CardSearchInput.tsx (2). Already one component folder. The one genuine observation the clustering surfaced: config/queue.ts is not a battle module but 6 of its 7 nodes were absorbed into community 0 (queue.ts, \_redisUrl, battleTimerQueue, settlementQueue, xpGrantsQueue, tournamentQueue, activityEventsQueue - only bullConnection landed elsewhere, in community 31). It declares all five BullMQ queues in one file, four of which - settlement, xpGrants, tournament, activityEvents - serve non-battle domains, and it is imported by 7 modules across battle, tournament, activity and XP. It clustered into battle only because battleService, battleChannel and battleTimer are its densest importers. So the community label over-claims queue.ts; the file itself is a legitimate shared registry and does not need splitting either.

## Source Nodes

- queue.ts
- battleChannel.ts
- battleService.ts
- battleTimer.ts
- messageRouter.ts
- CardGrid.tsx
