/**
 * Indexer Backfill Script — Task 4.7
 *
 * Usage:
 *   tsx scripts/indexer-backfill.ts --from <blockNumber> --to <blockNumber>
 *
 * Processes historical on-chain events in 500-block chunks using
 * publicClient.getLogs. Idempotent — safe to re-run.
 *
 * After all blocks are processed, calls indexerService.confirmEvents with
 * the `--to` block to promote old PENDING events to CONFIRMED.
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

import { prisma } from "../src/config/database";
import { logger } from "../src/config/logger";
import { redis } from "../src/config/redis";
import { publicClient } from "../src/config/viem";
import { indexerService } from "../src/services/indexerService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { from: bigint; to: bigint } {
  const argv = process.argv.slice(2);
  let fromBlock: bigint | undefined;
  let toBlock: bigint | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from" && argv[i + 1]) {
      fromBlock = BigInt(argv[i + 1]!);
      i++;
    } else if (argv[i] === "--to" && argv[i + 1]) {
      toBlock = BigInt(argv[i + 1]!);
      i++;
    }
  }

  if (fromBlock === undefined || toBlock === undefined) {
    console.error(
      "Usage: tsx scripts/indexer-backfill.ts --from <block> --to <block>",
    );
    process.exit(1);
  }

  if (fromBlock > toBlock) {
    console.error("--from must be <= --to");
    process.exit(1);
  }

  return { from: fromBlock, to: toBlock };
}

// ---------------------------------------------------------------------------
// Contract event definitions
// ---------------------------------------------------------------------------

interface ContractEventDef {
  contractName: string;
  address: `0x${string}`;
  abi: readonly unknown[];
  eventName: string;
}

function buildContractEvents(
  chainAddresses: ReturnType<typeof getAddresses>,
): ContractEventDef[] {
  return [
    {
      contractName: "packContract",
      address: chainAddresses.packContract,
      abi: packContractAbi,
      eventName: "PackFulfilled",
    },
    {
      contractName: "battleEngine",
      address: chainAddresses.battleEngine,
      abi: battleEngineAbi,
      eventName: "MatchSettled",
    },
    {
      contractName: "craftingEngine",
      address: chainAddresses.craftingEngine,
      abi: craftingEngineAbi,
      eventName: "FusionCrafted",
    },
    {
      contractName: "ammMarketplace",
      address: chainAddresses.ammMarketplace,
      abi: ammMarketplaceAbi,
      eventName: "CardBought",
    },
    {
      contractName: "ammMarketplace",
      address: chainAddresses.ammMarketplace,
      abi: ammMarketplaceAbi,
      eventName: "CardSold",
    },
    {
      contractName: "ammMarketplace",
      address: chainAddresses.ammMarketplace,
      abi: ammMarketplaceAbi,
      eventName: "LiquidityAdded",
    },
    {
      contractName: "ammMarketplace",
      address: chainAddresses.ammMarketplace,
      abi: ammMarketplaceAbi,
      eventName: "LiquidityRemoved",
    },
    {
      contractName: "guildSystem",
      address: chainAddresses.guildSystem,
      abi: guildSystemAbi,
      eventName: "GuildCreated",
    },
    {
      contractName: "guildSystem",
      address: chainAddresses.guildSystem,
      abi: guildSystemAbi,
      eventName: "MemberJoined",
    },
    {
      contractName: "guildSystem",
      address: chainAddresses.guildSystem,
      abi: guildSystemAbi,
      eventName: "MemberLeft",
    },
    {
      contractName: "guildSystem",
      address: chainAddresses.guildSystem,
      abi: guildSystemAbi,
      eventName: "GuildWarResult",
    },
    {
      contractName: "treasury",
      address: chainAddresses.treasury,
      abi: treasuryAbi,
      eventName: "BuybackTriggered",
    },
    {
      contractName: "veilToken",
      address: chainAddresses.veilToken,
      abi: veilTokenAbi,
      eventName: "Transfer",
    },
    {
      contractName: "shardToken",
      address: chainAddresses.shardToken,
      abi: shardTokenAbi,
      eventName: "Transfer",
    },
    {
      contractName: "cardNFT",
      address: chainAddresses.cardNFT,
      abi: cardNftAbi,
      eventName: "TransferSingle",
    },
    {
      contractName: "cardNFT",
      address: chainAddresses.cardNFT,
      abi: cardNftAbi,
      eventName: "TransferBatch",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { from: fromBlock, to: toBlock } = parseArgs();
  const chainAddresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
  const contractEvents = buildContractEvents(chainAddresses);

  const CHUNK_SIZE = 500n;
  let totalNew = 0;
  let totalDuplicates = 0;

  logger.info(
    { fromBlock: fromBlock.toString(), toBlock: toBlock.toString() },
    "indexer-backfill: starting",
  );

  for (const { contractName, address, abi, eventName } of contractEvents) {
    // Find the specific event ABI item
    const eventAbiItem = (abi as Array<{ name?: string; type?: string }>).find(
      (e) => e.name === eventName && e.type === "event",
    );

    if (!eventAbiItem) {
      logger.warn(
        { contractName, eventName },
        "indexer-backfill: event ABI not found — skipping",
      );
      continue;
    }

    let chunk = 0;
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
      chunk++;

      try {
        const logs = await publicClient.getLogs({
          address,
          // Use the ABI item directly; parseAbiItem needs a human-readable string
          // so we pass the JSON ABI item instead
          event: eventAbiItem as Parameters<
            typeof publicClient.getLogs
          >[0]["event"],
          fromBlock: start,
          toBlock: end,
        });

        for (const log of logs) {
          const args = (log.args ?? {}) as Record<string, unknown>;
          const blockNum = log.blockNumber ?? 0n;

          const { isNew } = await indexerService.recordEvent({
            txHash: log.transactionHash!,
            logIndex: log.logIndex!,
            contractName,
            eventName,
            blockNumber: blockNum,
            data: args,
            // Historical backfill must not trigger notifications.
            affectedAddresses: [],
          });

          if (isNew) {
            totalNew++;
          } else {
            totalDuplicates++;
          }
        }

        logger.info(
          {
            contractName,
            eventName,
            chunk,
            fromBlock: start.toString(),
            toBlock: end.toString(),
            logsFound: logs.length,
          },
          "indexer-backfill: chunk processed",
        );
      } catch (err) {
        logger.error(
          {
            contractName,
            eventName,
            fromBlock: start.toString(),
            toBlock: end.toString(),
            error: err instanceof Error ? err.message : String(err),
          },
          "indexer-backfill: chunk failed",
        );
      }
    }
  }

  // Confirm events up to the `to` block
  logger.info(
    { toBlock: toBlock.toString() },
    "indexer-backfill: confirming events",
  );
  await indexerService.confirmEvents(toBlock);

  logger.info({ totalNew, totalDuplicates }, "indexer-backfill: complete");
}

main()
  .catch((err) => {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "indexer-backfill: fatal error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  });
