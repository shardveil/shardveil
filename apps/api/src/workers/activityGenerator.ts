/**
 * Activity Generator Worker — Task 4.12
 *
 * BullMQ Worker listening on the `activity-events` queue.
 * Receives indexer-emitted events and maps them to ActivityType records
 * via activityService.recordActivity.
 *
 * Supported event mappings:
 *   craftingEngine.FusionCrafted    → CARD_CRAFTED  (actorAddress = crafter)
 *   packContract.PackFulfilled      → PACK_OPENED   (actorAddress = recipient)
 *   battleEngine.MatchSettled       → BATTLE_WON    (winner) + BATTLE_LOST (loser)
 *   guildSystem.MemberJoined        → GUILD_JOINED  (actorAddress = member)
 *   All others                      → skipped (debug log)
 *
 * Heartbeat: Redis key `worker:heartbeat:activityGenerator`, refreshed every 30 s,
 * TTL 60 s.
 *
 * Graceful shutdown: call the exported `shutdown()` function.
 * Do NOT register process.on signals here — index.ts handles that.
 */

import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { logger } from "../config/logger";
import { ACTIVITY_EVENTS_QUEUE, bullConnection } from "../config/queue";
import { redis } from "../config/redis";
import { activityService } from "../services/activityService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityEventJob {
  contractName: string;
  eventName: string;
  actorAddress: string;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_KEY = "worker:heartbeat:activityGenerator";
const HEARTBEAT_TTL_SECONDS = 60;

// ---------------------------------------------------------------------------
// Event → ActivityType mapping
// ---------------------------------------------------------------------------

/**
 * Map a (contractName, eventName) pair to the ActivityType string(s) that
 * should be generated.
 *
 * For battleEngine.MatchSettled two activities are needed (winner + loser),
 * so the handler is invoked with a special `BATTLE_SETTLED_DUAL` sentinel
 * and split inside the processor.
 */
const EVENT_MAP: Record<string, string> = {
  "craftingEngine.FusionCrafted": "CARD_CRAFTED",
  "packContract.PackFulfilled": "PACK_OPENED",
  "battleEngine.MatchSettled": "BATTLE_SETTLED_DUAL",
  "guildSystem.MemberJoined": "GUILD_JOINED",
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

function startHeartbeat(): void {
  const tick = (): void => {
    redis
      .set(HEARTBEAT_KEY, Date.now().toString(), "EX", HEARTBEAT_TTL_SECONDS)
      .catch((err) => {
        logger.warn(
          { error: err instanceof Error ? err.message : String(err) },
          "activityGenerator: heartbeat failed",
        );
      });
  };

  tick(); // fire immediately
  heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processActivityEvent(job: Job<ActivityEventJob>): Promise<void> {
  const { contractName, eventName, actorAddress, payload } = job.data;
  const eventKey = `${contractName}.${eventName}`;

  const mappedType = EVENT_MAP[eventKey];

  if (!mappedType) {
    logger.debug(
      { jobId: job.id, contractName, eventName },
      "activityGenerator: no mapping for event — skipping",
    );
    return;
  }

  logger.info(
    { jobId: job.id, contractName, eventName, actorAddress, mappedType },
    "activityGenerator: processing event",
  );

  if (mappedType === "BATTLE_SETTLED_DUAL") {
    // battleEngine.MatchSettled carries both winner and loser addresses in payload.
    // Expected payload shape: { winnerAddress: string, loserAddress: string, ... }
    const winnerAddress =
      typeof payload["winnerAddress"] === "string"
        ? payload["winnerAddress"]
        : actorAddress;
    const loserAddress =
      typeof payload["loserAddress"] === "string"
        ? payload["loserAddress"]
        : null;

    await activityService.recordActivity(winnerAddress, "BATTLE_WON", payload);

    if (loserAddress) {
      await activityService.recordActivity(
        loserAddress,
        "BATTLE_LOST",
        payload,
      );
    }
    return;
  }

  await activityService.recordActivity(actorAddress, mappedType, payload);
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

const worker = new Worker<ActivityEventJob>(
  ACTIVITY_EVENTS_QUEUE,
  processActivityEvent,
  {
    connection: bullConnection,
    concurrency: 5,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
);

worker.on("completed", (job) => {
  logger.info(
    {
      jobId: job.id,
      contractName: job.data.contractName,
      eventName: job.data.eventName,
    },
    "activityGenerator: job completed",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      contractName: job?.data?.contractName,
      eventName: job?.data?.eventName,
      attempts: job?.attemptsMade,
      error: err.message,
    },
    "activityGenerator: job failed",
  );
});

worker.on("error", (err) => {
  logger.error({ error: err.message }, "activityGenerator: worker error");
});

// ---------------------------------------------------------------------------
// Graceful shutdown — called by index.ts signal handlers
// ---------------------------------------------------------------------------

export function shutdown(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  worker.close().catch((err) => {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      "activityGenerator: error closing worker",
    );
  });

  logger.info("activityGenerator: shut down");
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

startHeartbeat();
logger.info("activityGenerator: started");
