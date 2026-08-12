---
type: "query"
date: "2026-08-12T15:48:35.004282+00:00"
question: "Why does redis connect battles, auth, chat, indexer, rate limiting, notifications and XP workers?"
contributor: "graphify"
source_nodes: ["redis", "CacheService", "rateLimit.ts", "connectionManager.ts"]
---

# Q: Why does redis connect battles, auth, chat, indexer, rate limiting, notifications and XP workers?

## Answer

The redis node (apps/api/src/config/redis.ts:65) is a single shared ioredis client singleton imported directly by 27 modules across 14 communities: ws channels (battleChannel, chatChannel, presenceChannel), connectionManager, wsAuth/wsRateLimit middleware, HTTP middleware (auth, rateLimit), services (authService, battleService, tournamentService, notificationService, activityService), all five workers (settlementSigner, xpSigner, activityGenerator, eventIndexer, tournamentWorker, vrfWatcher), the three indexer scripts, plus app.ts and index.ts. The coupling is not accidental: redis carries four distinct workloads through one client - BullMQ queues, WS presence/fanout state, JWT revocation and SIWE nonces, and rate-limit counters. A CacheService abstraction exists (apps/api/src/services/cacheService.ts:23) but only four modules use it (app.ts, adminGuard.ts, cardService.ts, leaderboardService.ts, profileService.ts); everything else bypasses it and touches the raw client. So the bridge node is really 'the module that never got an abstraction layer'. Practical consequence: a redis outage is a total API outage, not a degraded cache, and there is no seam to swap or namespace the four workloads independently.

## Source Nodes

- redis
- CacheService
- rateLimit.ts
- connectionManager.ts
