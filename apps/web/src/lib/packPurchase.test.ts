import { packContractAbi } from "@shardveil/contracts";
import type { PackTier } from "@shardveil/shared";
import { PACK_TIERS } from "@shardveil/shared";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  extractRequestId,
  formatShard,
  hasSufficientAllowance,
  PACK_TYPE_INDEX,
  PackPurchaseError,
  purchasePack,
  readPackConfig,
  toPurchaseError,
} from "./packPurchase";

const PACK = "0x4Acd78b844Cb39223C53c7B03086556b005a8E07" as const;
const SHARD = "0xC774697DABaC34A7509b4E29F774D535ff03Bb6C" as const;
const ACCOUNT = "0x1111111111111111111111111111111111111111" as const;

const ONE_TOKEN = 10n ** 18n;

/** Matches PackContract.initialize() — the values buyPack actually burns. */
const ON_CHAIN = {
  BASIC: { price: 100n * ONE_TOKEN, cardCount: 5, dailyLimit: 20, min: 1 },
  PREMIUM: { price: 500n * ONE_TOKEN, cardCount: 6, dailyLimit: 10, min: 2 },
  ELITE: { price: 2000n * ONE_TOKEN, cardCount: 7, dailyLimit: 5, min: 3 },
  MYTHIC: { price: 10000n * ONE_TOKEN, cardCount: 10, dailyLimit: 2, min: 4 },
} as const;

/** Build a real PackPurchased log so decoding is exercised, not stubbed. */
function packPurchasedLog(requestId: bigint, address: string = PACK) {
  const topics = encodeEventTopics({
    abi: packContractAbi,
    eventName: "PackPurchased",
    args: { buyer: ACCOUNT },
  });

  return {
    address,
    topics,
    // Non-indexed: packType (uint8), requestId (uint256)
    data: encodeAbiParameters(
      [{ type: "uint8" }, { type: "uint256" }],
      [0, requestId],
    ),
  };
}

function fakeClients(overrides: {
  price?: bigint;
  allowance?: bigint;
  balance?: bigint;
  requestId?: bigint;
  writeContract?: ReturnType<typeof vi.fn>;
}) {
  const {
    price = ON_CHAIN.BASIC.price,
    allowance = 0n,
    balance = 1_000_000n * ONE_TOKEN,
    requestId = 7n,
  } = overrides;

  const readContract = vi.fn(
    async ({ functionName }: { functionName: string }) => {
      if (functionName === "packConfigs") return [price, 5, 20, 1];
      if (functionName === "allowance") return allowance;
      if (functionName === "balanceOf") return balance;
      throw new Error(`unexpected read: ${functionName}`);
    },
  );

  const writeContract =
    overrides.writeContract ?? vi.fn(async () => "0xhash" as const);

  const publicClient = {
    readContract,
    waitForTransactionReceipt: vi.fn(async () => ({
      logs: [packPurchasedLog(requestId)],
    })),
  };

  const walletClient = { writeContract, chain: undefined };

  return { publicClient, walletClient, readContract, writeContract };
}

function run(
  clients: ReturnType<typeof fakeClients>,
  tier: PackTier = "BASIC",
) {
  return purchasePack({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicClient: clients.publicClient as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletClient: clients.walletClient as any,
    account: ACCOUNT,
    packContract: PACK,
    shardToken: SHARD,
    tier,
  });
}

describe("PACK_TIERS vs on-chain packConfigs", () => {
  // buyPack burns the on-chain price via burnFrom. When the shared constant is
  // lower, the UI approves too little and every purchase reverts.
  it.each(["BASIC", "PREMIUM", "ELITE", "MYTHIC"] as const)(
    "%s display price matches the contract",
    (tier) => {
      expect(PACK_TIERS[tier].costWei).toBe(ON_CHAIN[tier].price);
    },
  );

  it.each(["BASIC", "PREMIUM", "ELITE", "MYTHIC"] as const)(
    "%s card count and daily limit match the contract",
    (tier) => {
      expect(PACK_TIERS[tier].cardCount).toBe(ON_CHAIN[tier].cardCount);
      expect(PACK_TIERS[tier].dailyLimit).toBe(ON_CHAIN[tier].dailyLimit);
    },
  );

  it("maps tiers to the Solidity enum ordinals in declaration order", () => {
    expect(PACK_TYPE_INDEX).toEqual({
      BASIC: 0,
      PREMIUM: 1,
      ELITE: 2,
      MYTHIC: 3,
    });
  });
});

describe("readPackConfig", () => {
  it("returns the on-chain struct as named fields", async () => {
    const { publicClient } = fakeClients({ price: ON_CHAIN.PREMIUM.price });

    const config = await readPackConfig(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient as any,
      PACK,
      "PREMIUM",
    );

    expect(config.price).toBe(ON_CHAIN.PREMIUM.price);
    expect(config.cardCount).toBe(5);
  });
});

describe("hasSufficientAllowance", () => {
  it("is true when the allowance exactly equals the price", async () => {
    const { publicClient } = fakeClients({ allowance: 100n * ONE_TOKEN });

    await expect(
      hasSufficientAllowance(
        publicClient as any,
        SHARD,
        ACCOUNT,
        PACK,
        100n * ONE_TOKEN,
      ),
    ).resolves.toBe(true);
  });

  it("is false when the allowance is one wei short", async () => {
    const { publicClient } = fakeClients({ allowance: 100n * ONE_TOKEN - 1n });

    await expect(
      hasSufficientAllowance(
        publicClient as any,
        SHARD,
        ACCOUNT,
        PACK,
        100n * ONE_TOKEN,
      ),
    ).resolves.toBe(false);
  });
});

describe("purchasePack", () => {
  it("approves then buys when there is no allowance", async () => {
    const clients = fakeClients({ allowance: 0n });

    const result = await run(clients);

    const calls = clients.writeContract.mock.calls.map(
      (c) => (c[0] as { functionName: string }).functionName,
    );
    expect(calls).toEqual(["approve", "buyPack"]);
    expect(result.approveHash).toBeDefined();
    expect(result.requestId).toBe(7n);
  });

  it("skips the approval when the allowance already covers the price", async () => {
    const clients = fakeClients({ allowance: 100n * ONE_TOKEN });

    const result = await run(clients);

    const calls = clients.writeContract.mock.calls.map(
      (c) => (c[0] as { functionName: string }).functionName,
    );
    expect(calls).toEqual(["buyPack"]);
    expect(result.approveHash).toBeUndefined();
  });

  it("approves the exact price, not an unbounded allowance", async () => {
    const clients = fakeClients({ allowance: 0n, price: ON_CHAIN.ELITE.price });

    await run(clients, "ELITE");

    const approveArgs = (
      clients.writeContract.mock.calls[0]?.[0] as { args: [string, bigint] }
    ).args;
    expect(approveArgs[0]).toBe(PACK);
    expect(approveArgs[1]).toBe(ON_CHAIN.ELITE.price);
  });

  it("uses the on-chain price even when it exceeds the shared constant", async () => {
    // Guards the exact drift that shipped: constant says 300, chain says 500.
    const clients = fakeClients({ allowance: 0n, price: 500n * ONE_TOKEN });

    const result = await run(clients, "PREMIUM");

    expect(result.price).toBe(500n * ONE_TOKEN);
  });

  it("refuses before prompting the wallet when the balance is short", async () => {
    const clients = fakeClients({ balance: 1n, price: 100n * ONE_TOKEN });

    const error = await run(clients).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PackPurchaseError);
    expect((error as PackPurchaseError).reason).toBe("INSUFFICIENT_BALANCE");
    expect(clients.writeContract).not.toHaveBeenCalled();
  });

  it("fails with NO_CONTRACT when the chain has no deployment", async () => {
    const clients = fakeClients({});

    const error = await purchasePack({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      publicClient: clients.publicClient as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walletClient: clients.walletClient as any,
      account: ACCOUNT,
      packContract: undefined,
      shardToken: SHARD,
      tier: "BASIC",
    }).catch((e: unknown) => e);

    expect((error as PackPurchaseError).reason).toBe("NO_CONTRACT");
  });

  it("surfaces a rejected wallet prompt as REJECTED", async () => {
    const clients = fakeClients({
      allowance: 0n,
      writeContract: vi.fn(async () => {
        throw new Error("User rejected the request.");
      }),
    });

    const error = await run(clients).catch((e: unknown) => e);

    expect((error as PackPurchaseError).reason).toBe("REJECTED");
  });
});

describe("extractRequestId", () => {
  it("decodes the requestId from a PackPurchased log", () => {
    expect(extractRequestId([packPurchasedLog(42n)], PACK)).toBe(42n);
  });

  it("ignores logs emitted by other contracts", () => {
    // An ERC20 Transfer from the SHARD token shares the receipt; decoding it
    // against the pack ABI must not yield a bogus id.
    const foreign = packPurchasedLog(999n, SHARD);

    expect(extractRequestId([foreign], PACK)).toBeNull();
  });

  it("returns null when no PackPurchased event is present", () => {
    expect(extractRequestId([], PACK)).toBeNull();
  });
});

describe("toPurchaseError", () => {
  it("maps the DailyLimitReached revert to an actionable message", () => {
    const mapped = toPurchaseError(
      new Error("execution reverted: custom error DailyLimitReached(uint8)"),
    );

    expect(mapped.reason).toBe("DAILY_LIMIT");
    expect(mapped.message).toContain("limit");
  });

  it("passes an unrecognised error through as UNKNOWN", () => {
    expect(toPurchaseError(new Error("nonce too low")).reason).toBe("UNKNOWN");
  });
});

describe("formatShard", () => {
  it("renders whole tokens with thousands separators", () => {
    expect(formatShard(10000n * ONE_TOKEN)).toBe("10,000");
    expect(formatShard(100n * ONE_TOKEN)).toBe("100");
  });
});
