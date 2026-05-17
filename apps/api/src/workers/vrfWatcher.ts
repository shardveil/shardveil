/**
 * VRF Watcher — Task 4.8
 *
 * Dedicated low-latency watcher for PackContract.PackFulfilled events.
 * The master event indexer (Task 4.7) already writes the DB row; this
 * watcher exists solely for the fast WebSocket push path.
 *
 * On PackFulfilled:
 *   1. Cache result in Redis under `pack:result:{requestId}` (TTL 1h)
 *   2. Push WS message to the player: channel=pack, type=FULFILLED
 *
 * If the player is offline the result stays cached in Redis and the
 * REST endpoint can retrieve it later.
 *
 * Heartbeat: Redis key `worker:heartbeat:vrfWatcher` refreshed every 30s.
 *
 * Graceful shutdown: call the exported `shutdown()` function.
 * Do NOT register process.on("SIGTERM") here — index.ts handles signals.
 */

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  getAddresses,
  packContractAbi,
} from "@shardveil/contracts";

import { logger } from "../config/logger";
import { redis } from "../config/redis";
import { publicClient } from "../config/viem";
import { connectionManager } from "../ws/connectionManager";

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let unwatch: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

function startHeartbeat(): void {
  heartbeatTimer = setInterval(() => {
    redis
      .set("worker:heartbeat:vrfWatcher", Date.now().toString(), "EX", 60)
      .catch((err) => {
        logger.warn(
          { error: err instanceof Error ? err.message : String(err) },
          "vrfWatcher: heartbeat failed",
        );
      });
  }, 30_000);

  // Fire immediately on start
  redis
    .set("worker:heartbeat:vrfWatcher", Date.now().toString(), "EX", 60)
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Graceful shutdown — called by index.ts signal handlers
// ---------------------------------------------------------------------------

export function shutdown(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (unwatch) {
    try {
      unwatch();
    } catch {
      // ignore
    }
    unwatch = null;
  }

  logger.info("vrfWatcher: shut down");
}

// ---------------------------------------------------------------------------
// PackFulfilled watcher
//
// Event args (from ABI):
//   buyer        — address (indexed) — the player who bought the pack
//   requestId    — uint256           — VRF request ID
//   cardsReceived — uint8            — number of cards minted
// ---------------------------------------------------------------------------

unwatch = publicClient.watchContractEvent({
  address: addresses.packContract,
  abi: packContractAbi,
  eventName: "PackFulfilled",
  onLogs: async (logs) => {
    for (const log of logs) {
      try {
        const { buyer, requestId, cardsReceived } = log.args as {
          buyer: `0x${string}`;
          requestId: bigint;
          cardsReceived: number;
        };

        const requestIdStr = requestId.toString();

        // 1. Cache pack result in Redis (TTL 1 hour)
        const cachePayload = JSON.stringify({
          requestId: requestIdStr,
          buyer,
          cardsReceived,
          pityTriggered: false, // full pity calculation in Module 09
          fulfilledAt: Date.now(),
        });

        await redis.set(
          `pack:result:${requestIdStr}`,
          cachePayload,
          "EX",
          3600,
        );

        // 2. Push WS message to the player
        connectionManager.sendToAddress(
          buyer,
          JSON.stringify({
            channel: "pack",
            type: "FULFILLED",
            payload: {
              requestId: requestIdStr,
              cardsReceived,
              pityTriggered: false,
            },
          }),
        );

        logger.info(
          { buyer, requestId: requestIdStr, cardsReceived },
          "vrfWatcher: PackFulfilled — cache written, WS pushed",
        );
      } catch (err) {
        logger.error({ err }, "vrfWatcher: error processing PackFulfilled");
      }
    }
  },
  onError: (err) => {
    logger.error({ err }, "vrfWatcher: watchContractEvent error");
  },
});

startHeartbeat();
logger.info("vrfWatcher: started");
