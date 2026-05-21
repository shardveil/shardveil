/**
 * Tournament Worker — Task 4.10
 *
 * BullMQ Worker listening on the `tournament` queue.
 * Handles three job types:
 *   - GENERATE_BRACKET : generate Swiss/single-elim pairings for round 1
 *   - ADVANCE_ROUND    : check if round is complete; create next round or finalize
 *   - FINALIZE         : directly finalize a tournament (on-chain + DB)
 *
 * Concurrency: 1 (one tournament operation at a time).
 * Retry: 3 attempts, exponential back-off (10 s / 30 s / 90 s).
 * Heartbeat: Redis key `worker:heartbeat:tournamentWorker`, refreshed every 30 s.
 *
 * Graceful shutdown: call the exported `shutdown()` function.
 * Do NOT register process.on("SIGTERM") here — index.ts handles signals.
 */

import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { logger } from "../config/logger";
import { bullConnection, TOURNAMENT_QUEUE } from "../config/queue";
import { redis } from "../config/redis";
import { tournamentService } from "../services/tournamentService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TournamentJobType =
  | "GENERATE_BRACKET"
  | "ADVANCE_ROUND"
  | "FINALIZE";

export interface TournamentJob {
  type: TournamentJobType;
  tournamentId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_KEY = "worker:heartbeat:tournamentWorker";
const HEARTBEAT_TTL_SECONDS = 60;

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
          "tournamentWorker: heartbeat failed",
        );
      });
  };

  tick(); // fire immediately
  heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processTournamentJob(job: Job<TournamentJob>): Promise<void> {
  const { type, tournamentId } = job.data;

  logger.info(
    { jobId: job.id, type, tournamentId, attempt: job.attemptsMade + 1 },
    "tournamentWorker: processing job",
  );

  switch (type) {
    case "GENERATE_BRACKET":
      await tournamentService.generateBracket(tournamentId);
      break;

    case "ADVANCE_ROUND":
      await tournamentService.advanceRound(tournamentId);
      break;

    case "FINALIZE":
      await tournamentService.finalizeTournament(tournamentId);
      break;

    default: {
      // TypeScript exhaustiveness guard — should never reach here
      const _exhaustive: never = type;
      throw new Error(
        `tournamentWorker: unknown job type ${String(_exhaustive)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

const worker = new Worker<TournamentJob>(
  TOURNAMENT_QUEUE,
  processTournamentJob,
  {
    connection: bullConnection,
    concurrency: 1,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10_000, // 10s → 30s → 90s
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
);

worker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, type: job.data.type, tournamentId: job.data.tournamentId },
    "tournamentWorker: job completed",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      type: job?.data?.type,
      tournamentId: job?.data?.tournamentId,
      attempts: job?.attemptsMade,
      error: err.message,
    },
    "tournamentWorker: job failed",
  );
});

worker.on("error", (err) => {
  logger.error({ error: err.message }, "tournamentWorker: worker error");
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
      "tournamentWorker: error closing worker",
    );
  });

  logger.info("tournamentWorker: shut down");
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

startHeartbeat();
logger.info("tournamentWorker: started");
