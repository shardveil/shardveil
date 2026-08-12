import { describe, expect, it } from "vitest";

import {
  INDEXER_LAG_TOLERANCE_BLOCKS,
  INDEXER_LAG_TOLERANCE_SECONDS,
} from "../src/app";

/**
 * Guards a units confusion, not arithmetic. The threshold used to be a bare
 * `100n`, which reads like a generous block allowance but is 25 seconds on a
 * 0.25s chain — less than the indexer's own 4s poll interval, so /health
 * reported "lagging" permanently and the signal became worthless.
 */
describe("indexer lag tolerance", () => {
  it("is far longer than the indexer's 4s watchContractEvent poll", () => {
    expect(INDEXER_LAG_TOLERANCE_SECONDS).toBeGreaterThan(60);
  });

  it("converts to blocks using the Arbitrum block time, not Ethereum's", () => {
    // 300s at ~0.25s/block. An Ethereum-mainnet assumption (~12s) would yield 25.
    expect(INDEXER_LAG_TOLERANCE_BLOCKS).toBe(1200n);
  });

  it("tolerates a lag that a healthy indexer actually produces", () => {
    // 4s poll + processing puts a healthy indexer tens of blocks behind head.
    const healthyLag = 100n;

    expect(healthyLag).toBeLessThan(INDEXER_LAG_TOLERANCE_BLOCKS);
  });
});
