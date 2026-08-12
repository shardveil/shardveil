/**
 * Card name metadata — off-chain, IPFS-pinned.
 *
 * CardRegistry stores stats only; it has no name field, and CardNFT's baseURI is
 * a single concatenated prefix rather than a per-token directory. So display
 * names live in one pinned JSON array keyed by cardId:
 *
 *   [{ "cardId": 1, "name": "Ash Rat", ... }, ...]
 *
 * That document is ~200 KB for 1000 cards, so it is fetched once and cached in
 * Redis next to the catalogue. When CARD_METADATA_CID is unset or the fetch
 * fails, every lookup misses and the catalogue falls back to "Card #N" — names
 * are cosmetic and must never take the card list down with them.
 */

import { z } from "zod";

import { env } from "../config/env";
import { logger } from "../config/logger";
import { cacheService } from "./cacheService";

const CARD_NAMES_CACHE_KEY = "cards:names";
const CARD_NAMES_CACHE_TTL = 86_400; // 24h — pinned content is immutable per CID
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Only cardId and name are consumed. The document repeats the on-chain stats,
 * but CardRegistry is authoritative for those — trusting IPFS for numbers that
 * drive gameplay would let a re-pin rewrite them.
 */
const cardNameEntrySchema = z.object({
  cardId: z.number().int().positive(),
  name: z.string().min(1),
});

const cardNamesSchema = z.array(cardNameEntrySchema);

/** cardId → display name. Empty when metadata is unconfigured or unreachable. */
export async function getCardNames(): Promise<Map<number, string>> {
  const cached =
    await cacheService.get<Record<string, string>>(CARD_NAMES_CACHE_KEY);

  if (cached !== null) {
    return new Map(
      Object.entries(cached).map(([id, name]) => [Number(id), name]),
    );
  }

  const cid = env.CARD_METADATA_CID;
  if (!cid) {
    return new Map();
  }

  const url = `${env.IPFS_GATEWAY_URL.replace(/\/$/, "")}/${cid}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error(
        { url, status: response.status },
        "Card metadata fetch failed — falling back to placeholder names",
      );
      return new Map();
    }

    const parsed = cardNamesSchema.safeParse(await response.json());

    if (!parsed.success) {
      logger.error(
        { url, issues: parsed.error.issues.slice(0, 3) },
        "Card metadata did not match the expected shape",
      );
      return new Map();
    }

    const names = new Map<number, string>();
    const record: Record<string, string> = {};

    for (const entry of parsed.data) {
      names.set(entry.cardId, entry.name);
      record[String(entry.cardId)] = entry.name;
    }

    await cacheService.set(CARD_NAMES_CACHE_KEY, record, CARD_NAMES_CACHE_TTL);
    logger.info({ url, count: names.size }, "Loaded card names from IPFS");

    return names;
  } catch (error) {
    logger.error(
      { error, url },
      "Card metadata unreachable — falling back to placeholder names",
    );
    return new Map();
  }
}
