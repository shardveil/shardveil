/**
 * Battle Timer Worker — Task 4.6
 *
 * BullMQ Worker listening on `battle-timers` queue.
 *
 * Job data: { matchId, address, turnNumber }
 *
 * On fire:
 *   1. Load battle state from Redis.
 *   2. If turnNumber no longer matches (player already moved) → skip.
 *   3. Otherwise: call forfeit(matchId, address, isAutoForfeit=true).
 *      - < 3 strikes: skip turn, advance to opponent, reschedule timer.
 *      - >= 3 strikes: finish match with opponent as winner.
 *
 * Reconnect timer job data: { matchId, address, type: 'reconnect' }
 *   On fire: if reconnect flag still set → forfeit the disconnected player.
 */

import type { BattleState } from "@shardveil/shared";
import { type Job, Worker } from "bullmq";

import { logger } from "../config/logger";
import { BATTLE_TIMER_QUEUE } from "../config/queue";
import type { Address } from "../config/viem";
import {
  forfeit,
  getBattleState,
  isReconnectPending,
} from "../services/battleService";
import { connectionManager } from "../ws/connectionManager";

// ---------------------------------------------------------------------------
// Job data shapes
// ---------------------------------------------------------------------------

interface TurnTimeoutJobData {
  matchId: string;
  address: Address;
  turnNumber: number;
  type?: "turn";
}

interface ReconnectTimeoutJobData {
  matchId: string;
  address: Address;
  type: "reconnect";
}

type TimerJobData = TurnTimeoutJobData | ReconnectTimeoutJobData;

// ---------------------------------------------------------------------------
// Outbound message helpers
// ---------------------------------------------------------------------------

function buildReconnectDeadlineMsg(
  matchId: string,
  deadlineAt: number,
): string {
  return JSON.stringify({
    channel: "battle",
    type: "RECONNECT_DEADLINE",
    payload: { matchId, deadlineAt },
  });
}

function buildTurnUpdateMsg(state: BattleState): string {
  return JSON.stringify({
    channel: "battle",
    type: "TURN_UPDATE",
    payload: state,
  });
}

function buildMatchSettledMsg(state: BattleState): string {
  return JSON.stringify({
    channel: "battle",
    type: "MATCH_SETTLED",
    payload: state,
  });
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processBattleTimerJob(job: Job<TimerJobData>): Promise<void> {
  const data = job.data;

  if (data.type === "reconnect") {
    // --- Reconnect timeout handler ---
    const { matchId, address } = data;

    const pending = await isReconnectPending(matchId, address);
    if (!pending) {
      // Player reconnected within grace window — nothing to do
      logger.debug(
        { matchId, address },
        "battle-timer: reconnect grace resolved",
      );
      return;
    }

    logger.info(
      { matchId, address },
      "battle-timer: reconnect grace expired — forfeiting",
    );

    await forfeit(matchId, address, true);

    // Notify the room
    const roomId = `battle:${matchId}`;
    try {
      const state = await getBattleState(matchId);
      if (state.status === "FINISHED") {
        connectionManager.sendToRoom(roomId, buildMatchSettledMsg(state));
      } else {
        connectionManager.sendToRoom(roomId, buildTurnUpdateMsg(state));
      }
    } catch {
      // State may no longer exist — ignore
    }
    return;
  }

  // --- Turn timeout handler ---
  const { matchId, address, turnNumber } = data as TurnTimeoutJobData;

  let state;
  try {
    state = await getBattleState(matchId);
  } catch {
    logger.debug({ matchId }, "battle-timer: battle not found — skipping");
    return;
  }

  // Check if the battle is still active at this turn
  if (state.status !== "ACTIVE") {
    logger.debug(
      { matchId, status: state.status },
      "battle-timer: battle no longer active — skipping",
    );
    return;
  }

  // Check if the turn has already advanced (player submitted an action)
  if (state.turnNumber !== turnNumber || state.currentTurn !== address) {
    logger.debug(
      { matchId, jobTurn: turnNumber, stateTurn: state.turnNumber },
      "battle-timer: turn already advanced — skipping",
    );
    return;
  }

  logger.info(
    { matchId, address, turnNumber },
    "battle-timer: turn timeout — auto-forfeiting",
  );

  await forfeit(matchId, address, true);

  // Broadcast updated state to the room
  const roomId = `battle:${matchId}`;
  try {
    const updated = await getBattleState(matchId);
    if (updated.status === "FINISHED") {
      connectionManager.sendToRoom(roomId, buildMatchSettledMsg(updated));
    } else {
      connectionManager.sendToRoom(roomId, buildTurnUpdateMsg(updated));
    }
  } catch {
    // State may no longer exist — ignore
  }
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

const bullConnection = {
  url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  maxRetriesPerRequest: null as null,
};

export const battleTimerWorker = new Worker<TimerJobData>(
  BATTLE_TIMER_QUEUE,
  processBattleTimerJob,
  {
    connection: bullConnection,
    concurrency: 20,
  },
);

battleTimerWorker.on("completed", (job) => {
  logger.debug(
    { jobId: job.id, name: job.name },
    "battle-timer: job completed",
  );
});

battleTimerWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, name: job?.name, error: err.message },
    "battle-timer: job failed",
  );
});

battleTimerWorker.on("error", (err) => {
  logger.error({ error: err.message }, "battle-timer: worker error");
});

logger.info("battle timer worker started");

export { buildReconnectDeadlineMsg };
