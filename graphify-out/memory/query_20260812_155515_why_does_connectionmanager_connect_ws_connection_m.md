---
type: "query"
date: "2026-08-12T15:55:15.679926+00:00"
question: "Why does ConnectionManager connect WS Connection Manager to Battle Engine and Timers, WebSocket Server and Routing, Chat and Moderation, Battle Settlement Signer, Server Entry and VRF Watcher, Chain Indexer and Backfill, WebSocket Integration Tests, Notification Service?"
contributor: "graphify"
source_nodes:
  [
    "ConnectionManager",
    "connectionManager.ts",
    ".sendToAddress()",
    ".sendToRoom()",
    "wsServer.ts",
    "battleTimer.ts",
  ]
---

# Q: Why does ConnectionManager connect WS Connection Manager to Battle Engine and Timers, WebSocket Server and Routing, Chat and Moderation, Battle Settlement Signer, Server Entry and VRF Watcher, Chain Indexer and Backfill, WebSocket Integration Tests, Notification Service?

## Answer

Expanded from original query via vocab: [connection, manager, socket, channel, presence, battle, chat, room, client, notification, settlement, signer, watcher]. Then traversed the ConnectionManager node directly (degree 22, apps/api/src/ws/connectionManager.ts:32). ConnectionManager is a class with a module-level singleton instance exported at connectionManager.ts:235, and it owns the only three maps that hold live sockets (sockets, byAddress, byRoom). Every push to a browser in this codebase goes through it, so it bridges by construction. Grep confirms all 8 importing modules the graph found, and every call site: wsServer.ts registers/unregisters/refreshes (99, 168, 189), battleChannel.ts joins rooms and fans out (194, 207, 250, 292, 294, 323, 405, 411), chatChannel.ts (266, 290, 413, 463), notificationService.ts:156, activityService.ts:126, and three workers - battleTimer.ts (116, 118, 167, 169), settlementSigner.ts (210, 211), vrfWatcher.ts:130. ws.test.ts and indexer.test.ts import it only to vi.mock it. The workers reaching into it is not a layering violation today: apps/api/src/index.ts:1-4 imports activityGenerator, battleTimer, tournamentWorker and xpSigner purely for their side effects, and render.yaml runs one startCommand (node apps/api/dist/index.js) as a single web service, so workers and the WS server share one process and one heap. The structural risk the bridge encodes: presence lives in Redis (presence:{address}, 300s TTL, connectionManager.ts:9 and 227) but fanout does not - sendToAddress (148) and sendToRoom (163) read only local in-memory maps and return silently when the set is empty. So on a second instance the presence key says a player is online while every battle turn, chat message, settlement notice and VRF result silently drops. render.yaml is plan: free with no numInstances, which is why this has not surfaced. Horizontal scaling requires a Redis pub/sub layer under sendToAddress/sendToRoom, not just more instances.

## Source Nodes

- ConnectionManager
- connectionManager.ts
- .sendToAddress()
- .sendToRoom()
- wsServer.ts
- battleTimer.ts
