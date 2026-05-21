/**
 * BullMQ Queue definitions — Task 4.6 / 4.10
 *
 * Exports queue name constants and Queue instances for:
 *   - battle-timers   : per-turn deadline jobs
 *   - settlement      : on-chain settlement signing
 *   - xp-grants       : XP award jobs after match resolution
 *   - tournament      : bracket generation, round advancement, finalization
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
export const TOURNAMENT_QUEUE = "tournament";
export const ACTIVITY_EVENTS_QUEUE = "activity-events";

// ---------------------------------------------------------------------------
// Shared BullMQ connection options
// BullMQ's `connection` is a plain ioredis RedisOptions — it does NOT accept
// a `url` field. Parse REDIS_URL into host/port/password instead.
// ---------------------------------------------------------------------------

const _redisUrl = new URL(env.REDIS_URL);

export const bullConnection = {
  host: _redisUrl.hostname,
  port: parseInt(_redisUrl.port || "6379", 10),
  password: _redisUrl.password || undefined,
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
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000, // 10 s → 30 s → 90 s
    },
  },
});

export const xpGrantsQueue = new Queue(XP_GRANTS_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const tournamentQueue = new Queue(TOURNAMENT_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000, // 10 s → 30 s → 90 s
    },
  },
});

export const activityEventsQueue = new Queue(ACTIVITY_EVENTS_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
  },
});

// Log queue errors
for (const queue of [
  battleTimerQueue,
  settlementQueue,
  xpGrantsQueue,
  tournamentQueue,
  activityEventsQueue,
]) {
  queue.on("error", (err) => {
    logger.error(
      { queue: queue.name, error: err.message },
      "BullMQ queue error",
    );
  });
}
