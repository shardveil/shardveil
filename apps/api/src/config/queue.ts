/**
 * BullMQ Queue definitions — Task 4.6
 *
 * Exports queue name constants and Queue instances for:
 *   - battle-timers   : per-turn deadline jobs
 *   - settlement      : on-chain settlement signing
 *   - xp-grants       : XP award jobs after match resolution
 */

import { Queue } from "bullmq";

import { env } from "./env";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Queue name constants
// ---------------------------------------------------------------------------

export const BATTLE_TIMER_QUEUE = "battle-timers";
export const SETTLEMENT_QUEUE = "settlement";
export const XP_GRANTS_QUEUE = "xp-grants";

// ---------------------------------------------------------------------------
// Shared BullMQ connection options
// BullMQ requires a separate ioredis connection (maxRetriesPerRequest: null).
// ---------------------------------------------------------------------------

const bullConnection = {
  url: env.REDIS_URL,
  // BullMQ requires maxRetriesPerRequest to be null
  maxRetriesPerRequest: null as null,
};

// ---------------------------------------------------------------------------
// Queue instances
// ---------------------------------------------------------------------------

export const battleTimerQueue = new Queue(BATTLE_TIMER_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const settlementQueue = new Queue(SETTLEMENT_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const xpGrantsQueue = new Queue(XP_GRANTS_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Log queue errors
for (const queue of [battleTimerQueue, settlementQueue, xpGrantsQueue]) {
  queue.on("error", (err) => {
    logger.error(
      { queue: queue.name, error: err.message },
      "BullMQ queue error",
    );
  });
}
