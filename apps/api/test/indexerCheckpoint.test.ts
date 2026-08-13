/**
 * eventIndexer checkpoint honesty.
 *
 * `indexer:lastBlock:{contract}` is what /health turns into the indexer's lag
 * number. Advancing it over a block whose event failed to record would report
 * a healthy indexer with missing events — and viem never awaits onLogs, so a
 * Redis failure in there escapes as an unhandled rejection.
 */

import { ARBITRUM_SEPOLIA_CHAIN_ID } from "@shardveil/contracts";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { captured, recordEvent, redisSet } = vi.hoisted(() => ({
  captured: [] as Array<(logs: unknown[]) => Promise<void>>,
  recordEvent: vi.fn(),
  // Resolved by default: the module fires a heartbeat set at import time.
  redisSet: vi.fn().mockResolvedValue("OK"),
}));

vi.mock("../src/config/viem", () => ({
  ACTIVE_CHAIN_ID: ARBITRUM_SEPOLIA_CHAIN_ID,
  publicClient: {
    watchContractEvent: vi.fn(
      (params: { onLogs: (l: unknown[]) => Promise<void> }) => {
        captured.push(params.onLogs);
        return vi.fn();
      },
    ),
  },
}));

vi.mock("../src/config/redis", () => ({
  redis: {
    set: redisSet,
    setex: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("../src/services/indexerService", () => ({
  indexerService: { recordEvent },
}));

const eventIndexer = await import("../src/workers/eventIndexer");

// The module starts a heartbeat interval at import; leave it running and the
// suite never exits.
afterAll(() => eventIndexer.shutdown());

/** The onLogs handler of the first registered watcher. */
const onLogs = captured[0]!;

function makeLog(blockNumber: bigint, logIndex: number) {
  return {
    blockNumber,
    logIndex,
    transactionHash: `0x${logIndex.toString(16).padStart(64, "0")}`,
    args: {},
  };
}

/** The block number the last redis.set stored, or null if it never ran. */
function storedCheckpoint(): bigint | null {
  const calls = redisSet.mock.calls;
  if (calls.length === 0) return null;
  return BigInt(calls[calls.length - 1]![1] as string);
}

describe("eventIndexer checkpoint", () => {
  beforeEach(() => {
    recordEvent.mockReset().mockResolvedValue(undefined);
    redisSet.mockReset().mockResolvedValue("OK");
  });

  it("registered a watcher at import", () => {
    expect(captured.length).toBeGreaterThan(0);
  });

  it("advances to the highest block when every event records", async () => {
    await onLogs([makeLog(10n, 0), makeLog(11n, 1), makeLog(12n, 2)]);

    expect(storedCheckpoint()).toBe(12n);
  });

  it("stops below the block whose event failed", async () => {
    recordEvent
      .mockResolvedValueOnce(undefined) // block 10 ok
      .mockRejectedValueOnce(new Error("db down")) // block 11 fails
      .mockResolvedValueOnce(undefined); // block 12 ok

    await onLogs([makeLog(10n, 0), makeLog(11n, 1), makeLog(12n, 2)]);

    expect(storedCheckpoint()).toBe(10n);
  });

  it("still records the rest of the batch after one failure", async () => {
    recordEvent
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue(undefined);

    await onLogs([makeLog(10n, 0), makeLog(11n, 1), makeLog(12n, 2)]);

    expect(recordEvent).toHaveBeenCalledTimes(3);
    // Blocks 11 and 12 recorded, but 10 did not — so the indexer can only
    // claim everything up to 9, and /health keeps reporting the lag.
    expect(storedCheckpoint()).toBe(9n);
  });

  it("does not reject when storing the checkpoint fails", async () => {
    redisSet.mockRejectedValueOnce(new Error("redis down"));

    await expect(onLogs([makeLog(10n, 0)])).resolves.toBeUndefined();
  });
});
