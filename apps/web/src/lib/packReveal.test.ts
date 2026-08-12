import { encodeAbiParameters, encodeEventTopics, parseAbiItem } from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  extractMintedCardIds,
  PackRevealTimeout,
  waitForPackFulfillment,
} from "./packReveal";

const PACK = "0x4Acd78b844Cb39223C53c7B03086556b005a8E07" as const;
const CARD_NFT = "0xbCc261B0f6c8A370b5d35532ABfAaa4958B02Db2" as const;
const BUYER = "0x1111111111111111111111111111111111111111" as const;
const STRANGER = "0x2222222222222222222222222222222222222222" as const;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

const TRANSFER_SINGLE = parseAbiItem(
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
);

/** Build a genuine ERC1155 TransferSingle log so decoding is really exercised. */
function transferSingleLog({
  address = CARD_NFT as string,
  from = ZERO as `0x${string}`,
  to = BUYER as `0x${string}`,
  id,
  value = 1n,
}: {
  address?: string;
  from?: `0x${string}`;
  to?: `0x${string}`;
  id: bigint;
  value?: bigint;
}) {
  return {
    address,
    topics: encodeEventTopics({
      abi: [TRANSFER_SINGLE],
      eventName: "TransferSingle",
      args: { operator: PACK, from, to },
    }),
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [id, value],
    ),
  };
}

describe("extractMintedCardIds", () => {
  it("returns the ids minted to the buyer", () => {
    const logs = [
      transferSingleLog({ id: 7n }),
      transferSingleLog({ id: 42n }),
      transferSingleLog({ id: 999n }),
    ];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toEqual([7, 42, 999]);
  });

  it("ignores transfers that are not mints", () => {
    // A secondary-market transfer in the same block must not appear in a reveal.
    const logs = [transferSingleLog({ id: 5n, from: STRANGER })];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toEqual([]);
  });

  it("ignores mints addressed to someone else", () => {
    const logs = [transferSingleLog({ id: 5n, to: STRANGER })];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toEqual([]);
  });

  it("ignores TransferSingle from a different contract", () => {
    const logs = [transferSingleLog({ id: 5n, address: PACK })];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toEqual([]);
  });

  it("expands an amount greater than one into repeated ids", () => {
    const logs = [transferSingleLog({ id: 3n, value: 2n })];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toEqual([3, 3]);
  });

  it("returns fewer ids than the tier size when a supply cap was hit", () => {
    // _attemptMintCard returns false on a capped rarity, so a 5-card BASIC pack
    // can legitimately mint 3. The reveal must show 3, not pad to 5.
    const logs = [
      transferSingleLog({ id: 1n }),
      transferSingleLog({ id: 2n }),
      transferSingleLog({ id: 3n }),
    ];

    expect(extractMintedCardIds(logs, CARD_NFT, BUYER)).toHaveLength(3);
  });
});

function fulfilledEvent(requestId: bigint, cardsReceived = 3) {
  return {
    args: { buyer: BUYER, requestId, cardsReceived },
    transactionHash: "0xfeed" as const,
  };
}

describe("waitForPackFulfillment", () => {
  it("resolves with the minted ids once the event appears", async () => {
    const publicClient = {
      getContractEvents: vi.fn().mockResolvedValue([fulfilledEvent(7n)]),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        logs: [transferSingleLog({ id: 11n }), transferSingleLog({ id: 12n })],
      }),
    };

    const result = await waitForPackFulfillment({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient: publicClient as any,
      packContract: PACK,
      cardNft: CARD_NFT,
      buyer: BUYER,
      requestId: 7n,
      fromBlock: 1n,
    });

    expect(result.cardIds).toEqual([11, 12]);
    expect(result.cardsReceived).toBe(3);
    expect(result.txHash).toBe("0xfeed");
  });

  it("ignores another pending pack's fulfillment", async () => {
    // Two packs bought in quick succession both emit PackFulfilled for this
    // buyer; matching on buyer alone would reveal the wrong cards.
    const publicClient = {
      getContractEvents: vi
        .fn()
        .mockResolvedValueOnce([fulfilledEvent(6n)])
        .mockResolvedValue([fulfilledEvent(6n), fulfilledEvent(7n)]),
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValue({ logs: [transferSingleLog({ id: 21n })] }),
    };

    const result = await waitForPackFulfillment({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient: publicClient as any,
      packContract: PACK,
      cardNft: CARD_NFT,
      buyer: BUYER,
      requestId: 7n,
      fromBlock: 1n,
      pollIntervalMs: 1,
    });

    expect(publicClient.getContractEvents).toHaveBeenCalledTimes(2);
    expect(result.cardIds).toEqual([21]);
  });

  it("keeps polling until the event shows up", async () => {
    const publicClient = {
      getContractEvents: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([fulfilledEvent(7n)]),
      getTransactionReceipt: vi
        .fn()
        .mockResolvedValue({ logs: [transferSingleLog({ id: 1n })] }),
    };

    const result = await waitForPackFulfillment({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient: publicClient as any,
      packContract: PACK,
      cardNft: CARD_NFT,
      buyer: BUYER,
      requestId: 7n,
      fromBlock: 1n,
      pollIntervalMs: 1,
    });

    expect(publicClient.getContractEvents).toHaveBeenCalledTimes(3);
    expect(result.cardIds).toEqual([1]);
  });

  it("times out rather than hanging forever", async () => {
    const publicClient = {
      getContractEvents: vi.fn().mockResolvedValue([]),
      getTransactionReceipt: vi.fn(),
    };

    const error = await waitForPackFulfillment({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient: publicClient as any,
      packContract: PACK,
      cardNft: CARD_NFT,
      buyer: BUYER,
      requestId: 7n,
      fromBlock: 1n,
      timeoutMs: 5,
      pollIntervalMs: 1,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PackRevealTimeout);
    // The SHARD is already burned, so the copy must not imply the pack was lost.
    expect((error as Error).message).toContain("purchase is safe");
  });
});
