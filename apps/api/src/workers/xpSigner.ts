/**
 * XP Signer Worker — Task 4.11
 *
 * BullMQ Worker listening on the `xp-grants` queue.
 * For each job this worker:
 *   1. Checks Redis idempotency set — skips if sourceEventId already processed.
 *   2. If SeasonPass contract is deployed: simulate + submit addXp tx via
 *      XP_ORACLE_ROLE wallet.
 *   3. Marks sourceEventId as processed in Redis (TTL 30 days).
 *
 * Idempotency key: Redis set `xp:granted:ids`, per-sourceEventId SADD/SISMEMBER.
 *
 * Heartbeat: Redis key `worker:heartbeat:xpSigner`, refreshed every 30 s.
 *
 * Graceful shutdown: call the exported `shutdown()` function.
 * Do NOT register process.on("SIGTERM") here — index.ts handles signals.
 */

import { ARBITRUM_SEPOLIA_CHAIN_ID, getAddresses } from "@shardveil/contracts";
import type { Job } from "bullmq";
import { Worker } from "bullmq";

import { logger } from "../config/logger";
import { bullConnection, XP_GRANTS_QUEUE } from "../config/queue";
import { redis } from "../config/redis";
import { publicClient, xpOracleWallet } from "../config/viem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface XpGrantJob {
  playerAddress: string;
  amount: number;
  source: string; // 'BATTLE_WIN' | 'PACK_OPEN' | 'CRAFT' | 'DAILY_LOGIN' | 'TOURNAMENT_WIN'
  seasonId: number;
  sourceEventId: string; // txHash or unique ID for idempotency
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_KEY = "worker:heartbeat:xpSigner";
const HEARTBEAT_TTL_SECONDS = 60;

/** Redis set key for deduplication. Entries expire 30 days after last EXPIRE call. */
const GRANTED_IDS_KEY = "xp:granted:ids";
const GRANTED_IDS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Default XP amounts per source type.
 * Used when job.data.amount is 0 or not provided.
 */
const XP_AMOUNTS: Record<string, number> = {
  BATTLE_WIN: 10,
  PACK_OPEN: 5,
  CRAFT: 20,
  DAILY_LOGIN: 2,
  TOURNAMENT_WIN: 50,
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
          "xpSigner: heartbeat failed",
        );
      });
  };

  tick(); // fire immediately
  heartbeatTimer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

async function processXpGrantJob(job: Job<XpGrantJob>): Promise<void> {
  const { playerAddress, amount, source, seasonId, sourceEventId } = job.data;

  logger.info(
    { jobId: job.id, playerAddress, source, seasonId, sourceEventId },
    "xpSigner: processing job",
  );

  // 1. Idempotency check — skip if already processed
  const alreadyGranted = await redis.sismember(GRANTED_IDS_KEY, sourceEventId);
  if (alreadyGranted) {
    logger.info(
      { jobId: job.id, sourceEventId },
      "xpSigner: sourceEventId already processed — skipping (idempotent)",
    );
    return;
  }

  // Resolve effective XP amount
  const effectiveAmount =
    amount && amount > 0 ? amount : (XP_AMOUNTS[source] ?? 0);

  if (effectiveAmount <= 0) {
    logger.warn(
      { jobId: job.id, source, amount },
      "xpSigner: zero XP amount resolved — marking complete without grant",
    );
    // Still mark as processed to avoid re-processing
    await markProcessed(sourceEventId);
    return;
  }

  // 2. Check if SeasonPass contract is deployed
  const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);

  // seasonPass is not yet in the addresses map — guard with type assertion
  const seasonPassAddress = (addresses as Record<string, string | null>)[
    "seasonPass"
  ];

  if (!seasonPassAddress) {
    logger.warn(
      {
        jobId: job.id,
        sourceEventId,
        playerAddress,
        effectiveAmount,
        seasonId,
      },
      "xpSigner: SeasonPass contract not deployed — skipping on-chain call, marking complete",
    );
    await markProcessed(sourceEventId);
    return;
  }

  // 3. Simulate + submit tx via XP oracle wallet
  const wallet = xpOracleWallet();

  // SeasonPass ABI fragment — addXp(address player, uint256 amount, uint256 seasonId)
  // Function name confirmed from spec; ABI not yet published in @shardveil/contracts.
  const seasonPassAbi = [
    {
      name: "addXp",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "player", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "seasonId", type: "uint256" },
      ],
      outputs: [],
    },
  ] as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let simulatedRequest: any;

  try {
    const { request } = await publicClient.simulateContract({
      address: seasonPassAddress as `0x${string}`,
      abi: seasonPassAbi,
      functionName: "addXp",
      args: [
        playerAddress as `0x${string}`,
        BigInt(effectiveAmount),
        BigInt(seasonId),
      ],
      account: wallet.account,
    });
    simulatedRequest = request;
  } catch (simErr) {
    const errMsg = simErr instanceof Error ? simErr.message : String(simErr);
    logger.error(
      { jobId: job.id, sourceEventId, playerAddress, error: errMsg },
      "xpSigner: simulation failed — retrying",
    );
    throw simErr;
  }

  let txHash: `0x${string}`;
  try {
    txHash = await wallet.writeContract(simulatedRequest);
  } catch (writeErr) {
    const errMsg =
      writeErr instanceof Error ? writeErr.message : String(writeErr);
    logger.error(
      { jobId: job.id, sourceEventId, playerAddress, error: errMsg },
      "xpSigner: writeContract failed — retrying",
    );
    throw writeErr;
  }

  logger.info(
    {
      jobId: job.id,
      sourceEventId,
      playerAddress,
      txHash,
      effectiveAmount,
      seasonId,
    },
    "xpSigner: addXp tx submitted, waiting for receipt",
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  logger.info(
    {
      jobId: job.id,
      sourceEventId,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      playerAddress,
      effectiveAmount,
    },
    "xpSigner: addXp tx confirmed",
  );

  // 4. Mark as processed (idempotency)
  await markProcessed(sourceEventId);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Atomically add sourceEventId to the granted set and refresh the set's TTL.
 * Uses a Redis pipeline to reduce round-trips.
 */
async function markProcessed(sourceEventId: string): Promise<void> {
  await redis
    .pipeline()
    .sadd(GRANTED_IDS_KEY, sourceEventId)
    .expire(GRANTED_IDS_KEY, GRANTED_IDS_TTL_SECONDS)
    .exec();
}

// ---------------------------------------------------------------------------
// Worker instance
// ---------------------------------------------------------------------------

const worker = new Worker<XpGrantJob>(XP_GRANTS_QUEUE, processXpGrantJob, {
  connection: bullConnection,
  concurrency: 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

worker.on("completed", (job) => {
  logger.info(
    { jobId: job.id, sourceEventId: job.data.sourceEventId },
    "xpSigner: job completed",
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      sourceEventId: job?.data?.sourceEventId,
      attempts: job?.attemptsMade,
      error: err.message,
    },
    "xpSigner: job failed",
  );
});

worker.on("error", (err) => {
  logger.error({ error: err.message }, "xpSigner: worker error");
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
      "xpSigner: error closing worker",
    );
  });

  logger.info("xpSigner: shut down");
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

startHeartbeat();
logger.info("xpSigner: started");
