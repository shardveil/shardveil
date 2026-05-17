/**
 * Settlement Signer Worker — Task 4.9
 *
 * BullMQ Worker listening on the `settlement` queue.
 * When battleService.signSettlement / requestSettlement enqueues a job with
 * both player signatures, this worker:
 *   1. Simulates BattleEngine.settleMatch on-chain (dry-run).
 *   2. If simulation fails  → notifies both players, does NOT submit tx.
 *   3. If simulation passes → submits tx via settler wallet, waits for receipt.
 *   4. Pushes MATCH_SETTLED WS message to both players.
 *   5. Updates the Battle DB row (winner, txHash, settledAt).
 *
 * Retry: 3 attempts, exponential back-off (10 s / 30 s / 90 s).
 * After all retries exhausted: SYSTEM notification to both players.
 *
 * Heartbeat: Redis key `worker:heartbeat:settlementSigner`, refreshed every 30 s.
 *
 * Graceful shutdown: call the exported `shutdown()` function.
 * Do NOT register process.on("SIGTERM") here — index.ts handles signals.
 */

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  battleEngineAbi,
  getAddresses,
} from "@shardveil/contracts";
import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { bullConnection, SETTLEMENT_QUEUE } from "../config/queue";
import { redis } from "../config/redis";
import { publicClient, settlerWallet } from "../config/viem";
import * as notificationService from "../services/notificationService";
import { connectionManager } from "../ws/connectionManager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of the job data enqueued by battleService.signSettlement /
 * battleService.requestSettlement.
 *
 * Note: The spec references `signatures[]` and `gameStateHash`, but the
 * actual enqueued payload uses `sig1` / `sig2` (winner sig first, then loser sig).
 * `matchId` is the numeric on-chain matchId stored as a string (e.g. "1", "42").
 */
export interface SettlementJob {
  matchId: string; // on-chain uint256 matchId, stored as string
  winner: string; // Address – declared winner
  player1: string; // Address
  player2: string; // Address
  sig1: string; // player1's EIP-712 signature
  sig2: string; // player2's EIP-712 signature
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_KEY = "worker:heartbeat:settlementSigner";
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
          "settlementSigner: heartbeat failed",
        );
      });
  };

  tick(); // fire immediately
  heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMatchSettledMsg(
  matchId: string,
  winner: string,
  txHash: string,
): string {
  return JSON.stringify({
    channel: "battle",
    type: "MATCH_SETTLED",
    payload: { matchId, winner, txHash },
  });
}

async function notifyBothPlayers(
  player1: string,
  player2: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await Promise.allSettled([
    notificationService.create(player1 as `0x${string}`, "SYSTEM", payload),
    notificationService.create(player2 as `0x${string}`, "SYSTEM", payload),
  ]);
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processSettlementJob(job: Job<SettlementJob>): Promise<void> {
  const { matchId, winner, player1, player2, sig1, sig2 } = job.data;

  logger.info(
    { jobId: job.id, matchId, winner, attempt: job.attemptsMade + 1 },
    "settlementSigner: processing job",
  );

  // Determine winnerSig / loserSig.
  // sig1 is player1's sig, sig2 is player2's sig (per battleService).
  // The contract expects (matchId, winner, winnerSig, loserSig).
  const isPlayer1Winner = winner.toLowerCase() === player1.toLowerCase();
  const winnerSig = (isPlayer1Winner ? sig1 : sig2) as `0x${string}`;
  const loserSig = (isPlayer1Winner ? sig2 : sig1) as `0x${string}`;

  const onChainMatchId = BigInt(matchId);
  const battleEngineAddress = addresses.battleEngine;

  // 1. Simulate ---------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let simulatedRequest: any;

  try {
    const { request } = await publicClient.simulateContract({
      address: battleEngineAddress,
      abi: battleEngineAbi,
      functionName: "settleMatch",
      args: [onChainMatchId, winner as `0x${string}`, winnerSig, loserSig],
      account: settlerWallet().account,
    });
    simulatedRequest = request;
  } catch (simErr) {
    const errMsg = simErr instanceof Error ? simErr.message : String(simErr);
    logger.error(
      { jobId: job.id, matchId, error: errMsg },
      "settlementSigner: simulation failed — skipping tx submission",
    );

    await notifyBothPlayers(player1, player2, {
      error: "Settlement simulation failed",
      matchId,
    });

    // Throw so BullMQ retries / marks failed
    throw simErr;
  }

  // 2. Submit tx --------------------------------------------------------
  const wallet = settlerWallet();
  let txHash: `0x${string}`;

  try {
    txHash = await wallet.writeContract(simulatedRequest);
  } catch (writeErr) {
    const errMsg =
      writeErr instanceof Error ? writeErr.message : String(writeErr);
    logger.error(
      { jobId: job.id, matchId, error: errMsg },
      "settlementSigner: writeContract failed",
    );
    throw writeErr;
  }

  logger.info(
    { jobId: job.id, matchId, txHash },
    "settlementSigner: tx submitted, waiting for receipt",
  );

  // 3. Wait for receipt -------------------------------------------------
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  logger.info(
    {
      jobId: job.id,
      matchId,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
    },
    "settlementSigner: tx confirmed",
  );

  // 4. Push MATCH_SETTLED WS to both players ----------------------------
  const wsMsg = buildMatchSettledMsg(matchId, winner, receipt.transactionHash);
  connectionManager.sendToAddress(player1 as `0x${string}`, wsMsg);
  connectionManager.sendToAddress(player2 as `0x${string}`, wsMsg);

  // 5. Update DB Battle row ---------------------------------------------
  const settledAt = new Date();
  try {
    await prisma.battle.updateMany({
      where: { id: matchId },
      data: {
        winner,
        txHash: receipt.transactionHash,
        settledAt,
      },
    });
    logger.debug(
      { matchId, txHash: receipt.transactionHash },
      "settlementSigner: DB row updated",
    );
  } catch (dbErr) {
    // DB update failure is non-fatal — tx already confirmed on-chain
    logger.warn(
      {
        matchId,
        txHash: receipt.transactionHash,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      },
      "settlementSigner: DB update failed (tx confirmed; manual reconciliation needed)",
    );
  }
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

const worker = new Worker<SettlementJob>(
  SETTLEMENT_QUEUE,
  processSettlementJob,
  {
    connection: bullConnection,
    concurrency: 1, // one settlement at a time
  },
);

worker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, matchId: job.data.matchId },
    "settlementSigner: job completed",
  );
});

worker.on("failed", async (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      matchId: job?.data?.matchId,
      attempts: job?.attemptsMade,
      error: err.message,
    },
    "settlementSigner: job failed",
  );

  // After all retries exhausted, notify both players
  if (job && job.attemptsMade >= 3) {
    const { matchId, player1, player2 } = job.data;
    logger.error(
      { jobId: job.id, matchId },
      "settlementSigner: all retries exhausted — notifying players",
    );
    await notifyBothPlayers(player1, player2, {
      error: "Settlement failed after 3 attempts",
      matchId,
    }).catch((notifyErr) => {
      logger.error(
        {
          matchId,
          error:
            notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        },
        "settlementSigner: failed to send exhaustion notifications",
      );
    });
  }
});

worker.on("error", (err) => {
  logger.error({ error: err.message }, "settlementSigner: worker error");
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
      "settlementSigner: error closing worker",
    );
  });

  logger.info("settlementSigner: shut down");
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

startHeartbeat();
logger.info("settlementSigner: started");
