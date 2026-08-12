/**
 * Pack purchase flow — Task 7.2
 *
 * Deliberately free of React and wagmi: it takes viem clients as arguments so
 * the sequence can be exercised against a local Hardhat chain (or fakes) without
 * a browser or a wallet extension.
 *
 * On-chain sequence:
 *   1. read packConfigs(packType)      → authoritative price
 *   2. read allowance(owner, spender)  → skip the approve when already covered
 *   3. approve(packContract, price)    → only when short
 *   4. buyPack(packType)               → burns `price` via burnFrom, emits PackPurchased
 *   5. await PackFulfilled(requestId)  → Chainlink VRF callback, minutes later
 *
 * The price is ALWAYS read from the chain. PACK_TIERS in @shardveil/shared is a
 * display default; approving from it silently reverts whenever the two drift.
 */

import { packContractAbi, shardTokenAbi } from "@shardveil/contracts";
import type { PackTier } from "@shardveil/shared";
import type { Address, Hash, PublicClient, WalletClient } from "viem";
import { decodeEventLog } from "viem";

// ─── Pack type mapping ───────────────────────────────────────────────────────

/** Solidity `enum PackType { BASIC, PREMIUM, ELITE, MYTHIC }` ordinals. */
export const PACK_TYPE_INDEX: Record<PackTier, number> = {
  BASIC: 0,
  PREMIUM: 1,
  ELITE: 2,
  MYTHIC: 3,
};

export interface PackConfig {
  /** SHARD burned by buyPack, in wei. */
  price: bigint;
  cardCount: number;
  dailyLimit: number;
  /** ICardRegistry.Rarity ordinal guaranteed as a minimum. */
  guaranteedMin: number;
}

export class PackPurchaseError extends Error {
  public readonly reason:
    | "NO_CONTRACT"
    | "DAILY_LIMIT"
    | "INSUFFICIENT_BALANCE"
    | "REJECTED"
    | "UNKNOWN";

  constructor(reason: PackPurchaseError["reason"], message: string) {
    super(message);
    this.name = "PackPurchaseError";
    this.reason = reason;
  }
}

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * Read the live pack configuration. `packConfigs` is a public mapping, so viem
 * returns the struct as a positional tuple.
 */
export async function readPackConfig(
  publicClient: PublicClient,
  packContract: Address,
  tier: PackTier,
): Promise<PackConfig> {
  const result = (await publicClient.readContract({
    abi: packContractAbi,
    address: packContract,
    functionName: "packConfigs",
    args: [PACK_TYPE_INDEX[tier]],
  })) as readonly [bigint, number, number, number];

  const [price, cardCount, dailyLimit, guaranteedMin] = result;
  return { price, cardCount, dailyLimit, guaranteedMin };
}

/**
 * True when `owner` has already granted the pack contract at least `price`.
 * Callers use this to skip a redundant approval popup.
 */
export async function hasSufficientAllowance(
  publicClient: PublicClient,
  shardToken: Address,
  owner: Address,
  packContract: Address,
  price: bigint,
): Promise<boolean> {
  const allowance = (await publicClient.readContract({
    abi: shardTokenAbi,
    address: shardToken,
    functionName: "allowance",
    args: [owner, packContract],
  })) as bigint;

  return allowance >= price;
}

async function readBalance(
  publicClient: PublicClient,
  shardToken: Address,
  owner: Address,
): Promise<bigint> {
  return (await publicClient.readContract({
    abi: shardTokenAbi,
    address: shardToken,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export interface PurchaseParams {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: Address;
  packContract: Address | undefined;
  shardToken: Address | undefined;
  tier: PackTier;
}

export interface PurchaseResult {
  /** VRF request id from the PackPurchased event — the key to await fulfillment. */
  requestId: bigint;
  buyHash: Hash;
  /** Present only when an approval was actually needed. */
  approveHash?: Hash;
  price: bigint;
  /** Block the purchase landed in — the reveal scans for PackFulfilled from here. */
  blockNumber: bigint;
}

/**
 * Approve when short, then buy. Returns the VRF requestId to await.
 *
 * Balance is checked before prompting for anything — a wallet popup that can
 * only end in a revert is worse than an inline error.
 */
export async function purchasePack(
  params: PurchaseParams,
): Promise<PurchaseResult> {
  const {
    publicClient,
    walletClient,
    account,
    packContract,
    shardToken,
    tier,
  } = params;

  if (!packContract || !shardToken) {
    throw new PackPurchaseError(
      "NO_CONTRACT",
      "ShardVeil is not deployed on this network. Switch to Arbitrum Sepolia.",
    );
  }

  const { price } = await readPackConfig(publicClient, packContract, tier);

  const balance = await readBalance(publicClient, shardToken, account);
  if (balance < price) {
    throw new PackPurchaseError(
      "INSUFFICIENT_BALANCE",
      `This pack costs ${formatShard(price)} SHARD; the wallet holds ${formatShard(balance)}.`,
    );
  }

  let approveHash: Hash | undefined;
  const covered = await hasSufficientAllowance(
    publicClient,
    shardToken,
    account,
    packContract,
    price,
  );

  if (!covered) {
    // Approve the exact price rather than an unbounded allowance — a pack
    // purchase is not a reason to hand the contract the whole balance forever.
    approveHash = await sendOrThrow(() =>
      walletClient.writeContract({
        abi: shardTokenAbi,
        address: shardToken,
        functionName: "approve",
        args: [packContract, price],
        account,
        chain: walletClient.chain,
      }),
    );
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const buyHash = await sendOrThrow(() =>
    walletClient.writeContract({
      abi: packContractAbi,
      address: packContract,
      functionName: "buyPack",
      args: [PACK_TYPE_INDEX[tier]],
      account,
      chain: walletClient.chain,
    }),
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: buyHash,
  });
  const requestId = extractRequestId(receipt.logs, packContract);

  if (requestId === null) {
    throw new PackPurchaseError(
      "UNKNOWN",
      "The purchase confirmed but no PackPurchased event was found.",
    );
  }

  const blockNumber = receipt.blockNumber;

  return approveHash === undefined
    ? { requestId, buyHash, price, blockNumber }
    : { requestId, buyHash, approveHash, price, blockNumber };
}

/**
 * Pull the VRF requestId out of the PackPurchased event.
 *
 * Only logs from the pack contract are considered — buyPack also emits ERC20
 * Transfer/Approval logs, and a decode against the wrong ABI would either throw
 * or silently produce a bogus id.
 */
/** Shape shared by viem receipt logs and hand-built test logs. */
export interface DecodableLog {
  address: string;
  topics: readonly unknown[];
  data: string;
}

export function extractRequestId(
  logs: readonly DecodableLog[],
  packContract: Address,
): bigint | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== packContract.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: packContractAbi,
        topics: log.topics as [
          signature: `0x${string}`,
          ...args: `0x${string}`[],
        ],
        data: log.data as `0x${string}`,
      });

      if (decoded.eventName === "PackPurchased") {
        const args = decoded.args as unknown as { requestId: bigint };
        return args.requestId;
      }
    } catch {
      // Not an event from this ABI — keep scanning.
    }
  }

  return null;
}

// ─── Error mapping ───────────────────────────────────────────────────────────

/**
 * Wallet and node errors are unreadable by default. Map the two the user can
 * actually act on, and let everything else through as UNKNOWN.
 */
export function toPurchaseError(error: unknown): PackPurchaseError {
  if (error instanceof PackPurchaseError) return error;

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DailyLimitReached")) {
    return new PackPurchaseError(
      "DAILY_LIMIT",
      "You've hit today's limit for this pack tier. Try again tomorrow.",
    );
  }

  // Wallets report a dismissed prompt as 4001 / "User rejected".
  if (
    message.includes("User rejected") ||
    message.includes("User denied") ||
    message.includes("4001")
  ) {
    return new PackPurchaseError("REJECTED", "Transaction rejected.");
  }

  return new PackPurchaseError("UNKNOWN", message);
}

async function sendOrThrow(send: () => Promise<Hash>): Promise<Hash> {
  try {
    return await send();
  } catch (error) {
    throw toPurchaseError(error);
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** SHARD has 18 decimals. Trims to whole tokens — pack prices are round numbers. */
export function formatShard(wei: bigint): string {
  return (wei / 10n ** 18n).toLocaleString("en-US");
}
