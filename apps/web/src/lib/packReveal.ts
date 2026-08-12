/**
 * Pack reveal — the second half of Task 7.2.
 *
 * buyPack only requests randomness. Chainlink VRF calls back in a later block,
 * and PackContract emits PackFulfilled(buyer, requestId, cardsReceived) — a
 * COUNT, not the card ids. The ids come from CardNFT: _attemptMintCard calls
 * cardNFT.mint(buyer, cardId, 1), which emits a standard ERC1155 TransferSingle
 * with from == 0x0 in the same transaction.
 *
 * So the reveal is: poll for PackFulfilled matching our requestId, then pull the
 * minted ids out of that transaction's receipt.
 *
 * Like packPurchase.ts this takes a viem client as an argument and holds no
 * React, so the sequence is testable without a wallet or a live VRF round trip.
 */

import { packContractAbi } from "@shardveil/contracts";
import type { Address, Hash, PublicClient } from "viem";
import { decodeEventLog, parseAbiItem } from "viem";

/** ERC1155 mints come from the zero address. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const TRANSFER_SINGLE = parseAbiItem(
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
);

export interface RevealResult {
  /** Card ids minted by this pack. Shorter than the tier's cardCount when a supply cap was hit. */
  cardIds: number[];
  /** How many the contract reported minting — cross-check against cardIds.length. */
  cardsReceived: number;
  txHash: Hash;
}

export class PackRevealTimeout extends Error {
  constructor(requestId: bigint, waitedMs: number) {
    super(
      `Pack ${requestId} was not fulfilled within ${Math.round(waitedMs / 1000)}s. ` +
        `The purchase is safe — VRF can be slow. Reopen this page to keep waiting.`,
    );
    this.name = "PackRevealTimeout";
  }
}

/**
 * Decode the card ids minted to `buyer` from a fulfillment receipt.
 *
 * Only TransferSingle logs from CardNFT with from == 0x0 and to == buyer count.
 * The same receipt also carries PackFulfilled and any pity bookkeeping, and a
 * pack that hits a supply cap mints fewer cards than the tier's cardCount.
 */
export function extractMintedCardIds(
  logs: readonly {
    address: string;
    topics: readonly unknown[];
    data: string;
  }[],
  cardNft: Address,
  buyer: Address,
): number[] {
  const ids: number[] = [];

  for (const log of logs) {
    if (log.address.toLowerCase() !== cardNft.toLowerCase()) continue;

    try {
      const decoded = decodeEventLog({
        abi: [TRANSFER_SINGLE],
        topics: log.topics as [
          signature: `0x${string}`,
          ...args: `0x${string}`[],
        ],
        data: log.data as `0x${string}`,
      });

      const args = decoded.args as unknown as {
        from: string;
        to: string;
        id: bigint;
        value: bigint;
      };

      if (args.from.toLowerCase() !== ZERO_ADDRESS) continue;
      if (args.to.toLowerCase() !== buyer.toLowerCase()) continue;

      // value is the ERC1155 amount; a pack mints 1 of each card id.
      for (let n = 0n; n < args.value; n++) {
        ids.push(Number(args.id));
      }
    } catch {
      // Not a TransferSingle — skip.
    }
  }

  return ids;
}

export interface WaitParams {
  publicClient: PublicClient;
  packContract: Address;
  cardNft: Address;
  buyer: Address;
  requestId: bigint;
  /** Block to search from — the purchase block. Avoids scanning all history. */
  fromBlock: bigint;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 5_000;

/**
 * Poll until this request's PackFulfilled appears, then read the minted ids.
 *
 * Polling rather than watchContractEvent: a websocket dropped mid-wait silently
 * loses the event, and the reveal would hang forever with the user's SHARD
 * already burned.
 */
export async function waitForPackFulfillment(
  params: WaitParams,
): Promise<RevealResult> {
  const {
    publicClient,
    packContract,
    cardNft,
    buyer,
    requestId,
    fromBlock,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_MS,
  } = params;

  const startedAt = Date.now();

  for (;;) {
    const events = await publicClient.getContractEvents({
      abi: packContractAbi,
      address: packContract,
      eventName: "PackFulfilled",
      args: { buyer },
      fromBlock,
    });

    const match = events.find((event) => {
      const args = event.args as unknown as { requestId?: bigint };
      return args.requestId === requestId;
    });

    if (match?.transactionHash) {
      const receipt = await publicClient.getTransactionReceipt({
        hash: match.transactionHash,
      });

      const args = match.args as unknown as { cardsReceived?: number };

      return {
        cardIds: extractMintedCardIds(receipt.logs, cardNft, buyer),
        cardsReceived: Number(args.cardsReceived ?? 0),
        txHash: match.transactionHash,
      };
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new PackRevealTimeout(requestId, Date.now() - startedAt);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
