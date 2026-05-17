/**
 * Event Indexer Worker — Task 4.7
 *
 * Long-running process that uses viem `watchContractEvent` to subscribe to
 * on-chain events for all 10 deployed ShardVeil contracts.
 *
 * State:
 *   Redis key `indexer:lastBlock:{contractName}` — last indexed block (string)
 *
 * Heartbeat:
 *   Redis key `worker:heartbeat:eventIndexer` — Unix ms timestamp, TTL 60s
 *   Refreshed every 30s.
 *
 * Graceful shutdown:
 *   Call the exported `shutdown()` function (done by index.ts on SIGTERM/SIGINT).
 */

import {
  ammMarketplaceAbi,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  battleEngineAbi,
  cardNftAbi,
  craftingEngineAbi,
  getAddresses,
  guildSystemAbi,
  packContractAbi,
  shardTokenAbi,
  treasuryAbi,
  veilTokenAbi,
} from "@shardveil/contracts";

import { logger } from "../config/logger";
import { redis } from "../config/redis";
import { publicClient } from "../config/viem";
import { extractAddresses } from "../lib/extractAddresses";
import { indexerService } from "../services/indexerService";

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);

// ---------------------------------------------------------------------------
// Contract names exported so that indexer-status.ts can stay in sync
// ---------------------------------------------------------------------------

export const INDEXED_CONTRACT_NAMES = [
  "packContract",
  "battleEngine",
  "craftingEngine",
  "ammMarketplace",
  "guildSystem",
  "treasury",
  "veilToken",
  "shardToken",
  "cardNFT",
] as const;

// ---------------------------------------------------------------------------
// Watcher setup
// ---------------------------------------------------------------------------

/** Array of unwatch functions returned by watchContractEvent */
const unwatchers: Array<() => void> = [];

/**
 * Generic helper to set up a watcher for a single contract event.
 * Returns early (with a no-op unwatch) if the event cannot be found in the ABI.
 */
function watchEvent<TAbi extends readonly unknown[]>(params: {
  contractName: string;
  eventName: string;
  address: `0x${string}`;
  abi: TAbi;
}): void {
  const { contractName, eventName, address, abi } = params;

  const abiItem = (
    abi as unknown as Array<{ name?: string; type?: string }>
  ).find((e) => e.name === eventName && e.type === "event");

  if (!abiItem) {
    logger.error(
      { contractName, eventName },
      "eventIndexer: event not found in ABI, skipping",
    );
    return;
  }

  const unwatch = publicClient.watchContractEvent({
    address,
    abi,
    eventName: eventName as never,
    onLogs: async (logs) => {
      let maxBlock = 0n;

      for (const log of logs as Array<
        (typeof logs)[number] & { args?: Record<string, unknown> }
      >) {
        const blockNum = log.blockNumber ?? 0n;
        const args = (log.args ?? {}) as Record<string, unknown>;

        try {
          await indexerService.recordEvent({
            txHash: log.transactionHash!,
            logIndex: log.logIndex!,
            contractName,
            eventName,
            blockNumber: blockNum,
            data: args,
            affectedAddresses: extractAddresses(contractName, eventName, args),
          });
        } catch (err) {
          logger.error(
            {
              contractName,
              eventName,
              txHash: log.transactionHash,
              error: err instanceof Error ? err.message : String(err),
            },
            "eventIndexer: failed to record event",
          );
        }

        if (blockNum > maxBlock) maxBlock = blockNum;
      }

      if (maxBlock > 0n) {
        await redis.set(
          `indexer:lastBlock:${contractName}`,
          maxBlock.toString(),
        );
      }
    },
    onError: (err) => {
      logger.error(
        { contractName, eventName, error: err.message },
        "eventIndexer: watch error",
      );
    },
  });

  unwatchers.push(unwatch);
  logger.debug({ contractName, eventName }, "eventIndexer: watching event");
}

// ---------------------------------------------------------------------------
// Register all contract event watchers
// ---------------------------------------------------------------------------

// packContract — PackFulfilled
watchEvent({
  contractName: "packContract",
  eventName: "PackFulfilled",
  address: addresses.packContract,
  abi: packContractAbi,
});

// battleEngine — MatchSettled
watchEvent({
  contractName: "battleEngine",
  eventName: "MatchSettled",
  address: addresses.battleEngine,
  abi: battleEngineAbi,
});

// craftingEngine — FusionCrafted (spec calls it CardCrafted but ABI has FusionCrafted)
watchEvent({
  contractName: "craftingEngine",
  eventName: "FusionCrafted",
  address: addresses.craftingEngine,
  abi: craftingEngineAbi,
});

// ammMarketplace — CardBought, CardSold, LiquidityAdded, LiquidityRemoved
// (Note: spec lists "Swap" but actual ABI has CardBought/CardSold)
(
  ["CardBought", "CardSold", "LiquidityAdded", "LiquidityRemoved"] as const
).forEach((eventName) => {
  watchEvent({
    contractName: "ammMarketplace",
    eventName,
    address: addresses.ammMarketplace,
    abi: ammMarketplaceAbi,
  });
});

// guildSystem — GuildCreated, MemberJoined, MemberLeft, GuildWarResult
// (Note: spec lists "WarRecorded" but actual ABI has GuildWarResult)
(
  ["GuildCreated", "MemberJoined", "MemberLeft", "GuildWarResult"] as const
).forEach((eventName) => {
  watchEvent({
    contractName: "guildSystem",
    eventName,
    address: addresses.guildSystem,
    abi: guildSystemAbi,
  });
});

// treasury — BuybackTriggered (spec lists "BuybackExecuted" but ABI has BuybackTriggered)
watchEvent({
  contractName: "treasury",
  eventName: "BuybackTriggered",
  address: addresses.treasury,
  abi: treasuryAbi,
});

// veilToken — Transfer
watchEvent({
  contractName: "veilToken",
  eventName: "Transfer",
  address: addresses.veilToken,
  abi: veilTokenAbi,
});

// shardToken — Transfer
watchEvent({
  contractName: "shardToken",
  eventName: "Transfer",
  address: addresses.shardToken,
  abi: shardTokenAbi,
});

// cardNFT — TransferSingle, TransferBatch
(["TransferSingle", "TransferBatch"] as const).forEach((eventName) => {
  watchEvent({
    contractName: "cardNFT",
    eventName,
    address: addresses.cardNFT,
    abi: cardNftAbi,
  });
});

// cardRegistry — skipped (no user-facing events per spec)

logger.info(
  { watcherCount: unwatchers.length },
  "eventIndexer: all watchers started",
);

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

const heartbeatInterval = setInterval(() => {
  redis
    .set("worker:heartbeat:eventIndexer", Date.now().toString(), "EX", 60)
    .catch((err) => {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "eventIndexer: heartbeat failed",
      );
    });
}, 30_000);

// Fire immediately on start
redis
  .set("worker:heartbeat:eventIndexer", Date.now().toString(), "EX", 60)
  .catch(() => undefined);

// ---------------------------------------------------------------------------
// Graceful shutdown — called by index.ts signal handlers
// ---------------------------------------------------------------------------

export function shutdown(signal?: string): void {
  logger.info({ signal }, "eventIndexer: shutting down");

  clearInterval(heartbeatInterval);

  for (const unwatch of unwatchers) {
    try {
      unwatch();
    } catch {
      // ignore
    }
  }
}
