/**
 * Indexer Replay Script — Task 4.13
 *
 * Usage:
 *   tsx scripts/indexer-replay.ts --contract <contractName> --from <blockNumber>
 *
 * Replays events for a SINGLE contract from a given block to the current chain
 * head, in 500-block chunks. Calls indexerService.recordEvent which is
 * idempotent — safe to re-run on already-indexed ranges.
 *
 * --contract  (required) Single contract name, e.g. "packContract"
 * --from      (required) Block number to replay from
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
// Types
// ---------------------------------------------------------------------------

interface ContractEventDef {
  contractName: string;
  address: `0x${string}`;
  abi: readonly unknown[];
  eventName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { contract: string; from: bigint } {
  const argv = process.argv.slice(2);
  let contractName: string | undefined;
  let fromBlock: bigint | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--contract" && argv[i + 1]) {
      contractName = argv[i + 1]!;
      i++;
    } else if (argv[i] === "--from" && argv[i + 1]) {
      fromBlock = BigInt(argv[i + 1]!);
      i++;
    }
  }

  if (!contractName || fromBlock === undefined) {
    console.error(
      "Usage: tsx scripts/indexer-replay.ts --contract <contractName> --from <blockNumber>",
    );
    process.exit(1);
  }

  return { contract: contractName, from: fromBlock };
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
  const { contract: targetContract, from: fromBlock } = parseArgs();
  const chainAddresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
  const allContractEvents = buildContractEvents(chainAddresses);

  // Filter to only events belonging to the requested contract
  const contractEvents = allContractEvents.filter(
    (c) => c.contractName === targetContract,
  );

  if (contractEvents.length === 0) {
    logger.error(
      { contract: targetContract },
      "indexer-replay: unknown contract name",
    );
    console.error(
      `Unknown contract: "${targetContract}". Valid names: ${[
        ...new Set(allContractEvents.map((c) => c.contractName)),
      ].join(", ")}`,
    );
    process.exit(1);
  }

  // Fetch current chain head to use as the `to` block
  const toBlock = await publicClient.getBlockNumber();

  if (fromBlock > toBlock) {
    logger.error(
      { fromBlock: fromBlock.toString(), toBlock: toBlock.toString() },
      "indexer-replay: --from is beyond current chain head",
    );
    process.exit(1);
  }

  const CHUNK_SIZE = 500n;
  let totalNew = 0;
  let totalDuplicates = 0;

  logger.info(
    {
      contract: targetContract,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      eventCount: contractEvents.length,
    },
    "indexer-replay: starting",
  );

  for (const { contractName, address, abi, eventName } of contractEvents) {
    // Find the specific event ABI item
    const eventAbiItem = (abi as Array<{ name?: string; type?: string }>).find(
      (e) => e.name === eventName && e.type === "event",
    );

    if (!eventAbiItem) {
      logger.warn(
        { contractName, eventName },
        "indexer-replay: event ABI not found — skipping",
      );
      continue;
    }

    logger.info(
      {
        contractName,
        eventName,
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
      },
      "indexer-replay: replaying event",
    );

    let chunk = 0;

    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n;
      chunk++;

      try {
        const logs = await publicClient.getLogs({
          address,
          event: eventAbiItem as Parameters<
            typeof publicClient.getLogs
          >[0]["event"],
          fromBlock: start,
          toBlock: end,
        });

        let chunkNew = 0;
        let chunkDuplicates = 0;

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
            // Replay must not trigger notifications
            affectedAddresses: [],
          });

          if (isNew) {
            totalNew++;
            chunkNew++;
          } else {
            totalDuplicates++;
            chunkDuplicates++;
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
            newEvents: chunkNew,
            duplicates: chunkDuplicates,
          },
          "indexer-replay: chunk processed",
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
          "indexer-replay: chunk failed",
        );
      }
    }
  }

  logger.info(
    { contract: targetContract, totalNew, totalDuplicates },
    "indexer-replay: complete",
  );
}

main()
  .catch((err) => {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "indexer-replay: fatal error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  });
