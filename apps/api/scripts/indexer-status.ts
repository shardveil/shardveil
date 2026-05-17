/**
 * Indexer Status Script — Task 4.7
 *
 * Usage:
 *   tsx scripts/indexer-status.ts
 *
 * Prints a table showing, for each indexed contract:
 *   - contractName
 *   - lastBlock (from Redis `indexer:lastBlock:{name}`)
 *   - currentBlock (from the chain)
 *   - lag (currentBlock - lastBlock)
 */

import { prisma } from "../src/config/database";
import { redis } from "../src/config/redis";
import { publicClient } from "../src/config/viem";

// ---------------------------------------------------------------------------
// Contract names that are indexed (must match eventIndexer.ts)
// ---------------------------------------------------------------------------

const CONTRACT_NAMES = [
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

type ContractName = (typeof CONTRACT_NAMES)[number];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Fetch current block number from the chain
  const currentBlock = await publicClient.getBlockNumber();

  // Fetch last indexed block for each contract from Redis
  const lastBlockValues = await Promise.all(
    CONTRACT_NAMES.map((name) =>
      redis.get(`indexer:lastBlock:${name}`).then((v) => ({ name, value: v })),
    ),
  );

  // Build rows for the table
  const rows: {
    contractName: ContractName;
    lastBlock: string;
    currentBlock: string;
    lag: string;
  }[] = lastBlockValues.map(({ name, value }) => {
    const lastBlock = value !== null ? BigInt(value) : null;
    const lag =
      lastBlock !== null ? (currentBlock - lastBlock).toString() : "N/A";

    return {
      contractName: name,
      lastBlock: lastBlock !== null ? lastBlock.toString() : "N/A",
      currentBlock: currentBlock.toString(),
      lag,
    };
  });

  // Print table
  const col = (s: string, width: number): string => s.padEnd(width);

  const header = [
    col("contractName", 20),
    col("lastBlock", 14),
    col("currentBlock", 14),
    col("lag", 10),
  ].join("  ");

  const separator = "-".repeat(header.length);

  console.log("\nIndexer Status");
  console.log(separator);
  console.log(header);
  console.log(separator);

  for (const row of rows) {
    console.log(
      [
        col(row.contractName, 20),
        col(row.lastBlock, 14),
        col(row.currentBlock, 14),
        col(row.lag, 10),
      ].join("  "),
    );
  }

  console.log(separator);
  console.log(`Current block: ${currentBlock.toString()}\n`);
}

main()
  .catch((err) => {
    console.error("indexer-status: fatal error", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  });
