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
 *   On SIGTERM / SIGINT, all watchers are stopped and the process exits.
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
import { indexerService } from "../services/indexerService";

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);

// Zero address constant (used to filter out mint/burn pseudo-addresses)
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Address extractor helper
// ---------------------------------------------------------------------------

/**
 * Given a contract name + event name + log args, return the list of player
 * addresses that should be notified.
 */
function extractAddresses(
  contractName: string,
  eventName: string,
  args: Record<string, unknown>,
): string[] {
  const addr = (v: unknown): string | null => {
    if (typeof v === "string" && v !== ZERO_ADDRESS) return v;
    return null;
  };

  switch (`${contractName}:${eventName}`) {
    case "packContract:PackFulfilled": {
      const a = addr(args["player"] ?? args["buyer"]);
      return a ? [a] : [];
    }
    case "battleEngine:MatchSettled": {
      const a = addr(args["winner"]);
      return a ? [a] : [];
    }
    case "craftingEngine:FusionCrafted": {
      const a = addr(args["player"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:CardBought": {
      const a = addr(args["buyer"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:CardSold": {
      const a = addr(args["seller"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:LiquidityAdded":
    case "ammMarketplace:LiquidityRemoved": {
      const a = addr(args["provider"]);
      return a ? [a] : [];
    }
    case "guildSystem:GuildCreated": {
      const a = addr(args["master"]);
      return a ? [a] : [];
    }
    case "guildSystem:MemberJoined":
    case "guildSystem:MemberLeft": {
      const a = addr(args["member"]);
      return a ? [a] : [];
    }
    case "guildSystem:GuildWarResult":
    case "treasury:BuybackTriggered": {
      return [];
    }
    case "veilToken:Transfer":
    case "shardToken:Transfer": {
      const results: string[] = [];
      const f = addr(args["from"]);
      const t = addr(args["to"]);
      if (f) results.push(f);
      if (t) results.push(t);
      return results;
    }
    case "cardNFT:TransferSingle":
    case "cardNFT:TransferBatch": {
      const results: string[] = [];
      const f = addr(args["from"]);
      const t = addr(args["to"]);
      if (f) results.push(f);
      if (t) results.push(t);
      return results;
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Watcher setup
// ---------------------------------------------------------------------------

/** Array of unwatch functions returned by watchContractEvent */
const unwatchers: Array<() => void> = [];

/**
 * Generic helper to set up a watcher for a single contract event.
 */
function watchEvent<TAbi extends readonly unknown[]>(params: {
  contractName: string;
  eventName: string;
  address: `0x${string}`;
  abi: TAbi;
  eventAbi: TAbi[number];
}): void {
  const { contractName, eventName, address, abi, eventAbi } = params;

  const unwatch = publicClient.watchContractEvent({
    address,
    abi,
    eventName: eventName as never,
    onLogs: async (logs) => {
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

          await redis.set(
            `indexer:lastBlock:${contractName}`,
            blockNum.toString(),
          );
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
      }
    },
    onError: (err) => {
      logger.error(
        { contractName, eventName, error: err.message },
        "eventIndexer: watch error",
      );
    },
  });

  void eventAbi; // suppress unused warning
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
  eventAbi: packContractAbi.find(
    (e) => (e as { name?: string }).name === "PackFulfilled",
  )!,
});

// battleEngine — MatchSettled
watchEvent({
  contractName: "battleEngine",
  eventName: "MatchSettled",
  address: addresses.battleEngine,
  abi: battleEngineAbi,
  eventAbi: battleEngineAbi.find(
    (e) => (e as { name?: string }).name === "MatchSettled",
  )!,
});

// craftingEngine — FusionCrafted (spec calls it CardCrafted but ABI has FusionCrafted)
watchEvent({
  contractName: "craftingEngine",
  eventName: "FusionCrafted",
  address: addresses.craftingEngine,
  abi: craftingEngineAbi,
  eventAbi: craftingEngineAbi.find(
    (e) => (e as { name?: string }).name === "FusionCrafted",
  )!,
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
    eventAbi: ammMarketplaceAbi.find(
      (e) => (e as { name?: string }).name === eventName,
    )!,
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
    eventAbi: guildSystemAbi.find(
      (e) => (e as { name?: string }).name === eventName,
    )!,
  });
});

// treasury — BuybackTriggered (spec lists "BuybackExecuted" but ABI has BuybackTriggered)
watchEvent({
  contractName: "treasury",
  eventName: "BuybackTriggered",
  address: addresses.treasury,
  abi: treasuryAbi,
  eventAbi: treasuryAbi.find(
    (e) => (e as { name?: string }).name === "BuybackTriggered",
  )!,
});

// veilToken — Transfer
watchEvent({
  contractName: "veilToken",
  eventName: "Transfer",
  address: addresses.veilToken,
  abi: veilTokenAbi,
  eventAbi: veilTokenAbi.find(
    (e) =>
      (e as { name?: string }).name === "Transfer" &&
      (e as { type?: string }).type === "event",
  )!,
});

// shardToken — Transfer
watchEvent({
  contractName: "shardToken",
  eventName: "Transfer",
  address: addresses.shardToken,
  abi: shardTokenAbi,
  eventAbi: shardTokenAbi.find(
    (e) =>
      (e as { name?: string }).name === "Transfer" &&
      (e as { type?: string }).type === "event",
  )!,
});

// cardNFT — TransferSingle, TransferBatch
(["TransferSingle", "TransferBatch"] as const).forEach((eventName) => {
  watchEvent({
    contractName: "cardNFT",
    eventName,
    address: addresses.cardNFT,
    abi: cardNftAbi,
    eventAbi: cardNftAbi.find(
      (e) => (e as { name?: string }).name === eventName,
    )!,
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
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  logger.info({ signal }, "eventIndexer: shutting down");

  clearInterval(heartbeatInterval);

  for (const unwatch of unwatchers) {
    try {
      unwatch();
    } catch {
      // ignore
    }
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
