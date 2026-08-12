/**
 * Card service — reads card templates and pricing from on-chain contracts.
 *
 * Important:
 * - CardRegistry uses cardId.
 * - AMMMarketplace uses poolId for pricing.
 * - poolId !== cardId.
 *
 * Cache keys:
 *   - cards:all → active market card list, TTL 24h
 *   - cards:{cardId} → single card detail with prices, TTL 5min
 */

import {
  ammMarketplaceAbi,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  cardRegistryAbi,
  getAddresses,
} from "@shardveil/contracts";

import { logger } from "../config/logger";
import { publicClient } from "../config/viem";
import { ApiError, NotFoundError } from "../lib/errors";
import { cacheService } from "./cacheService";
import { getCardNames } from "./cardMetadataService";

// ============================================================================
// Types
// ============================================================================

export interface CardTemplate {
  cardId: number;
  rarity: number;
  cardType: number;
  atkBase: number;
  defBase: number;
  spdBase: number;
  hpBase: number;
  supplyCap: string;
  minted: string;
  active: boolean;
}

export interface CardCatalogItem extends CardTemplate {
  /**
   * AMM pool id for this card, or null when the card is registered but not listed
   * on the marketplace. Pricing functions use poolId, not cardId — skip them when null.
   */
  poolId: number | null;
  /**
   * Display name from the pinned metadata document, or null when metadata is
   * unconfigured/unreachable. CardRegistry has no name field, so this is the
   * only source — clients fall back to "Card #<id>".
   */
  name: string | null;
}

export interface CardDetail extends CardCatalogItem {
  /** null when the card has no marketplace pool — registered but not listed. */
  buyPrice: string | null;
  sellPrice: string | null;
  cachedAt: string;
}

export interface CardListResult {
  data: CardCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  cachedAt: string;
}

interface PoolInfo {
  poolId: number;
  cardId: number;
  active: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CARDS_ALL_CACHE_KEY = "cards:all";
const CARDS_ALL_CACHE_TTL = 86400; // 24 hours

// Do not cache empty result too long.
// Otherwise, if pools/templates are created after first request,
// API can stay empty for 24 hours.
const EMPTY_CARDS_CACHE_TTL = 60; // 1 minute

const CARD_DETAIL_CACHE_TTL = 300; // 5 minutes

const BATCH_SIZE = 20;

// ============================================================================
// Helper Functions
// ============================================================================

function getCardCacheKey(cardId: number): string {
  return `cards:${cardId}`;
}

/**
 * Highest cardId registered. CardRegistry has no enumeration and public RPCs reject wide
 * eth_getLogs ranges, so this counter is the only way to walk the catalogue.
 */
async function getMaxCardId(cardRegistry: `0x${string}`): Promise<number> {
  let raw: bigint;

  try {
    raw = await publicClient.readContract({
      address: cardRegistry,
      abi: cardRegistryAbi,
      functionName: "maxCardId",
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch maxCardId from CardRegistry");
    throw new ApiError(500, "RPC_ERROR", "Failed to fetch card registry size");
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 0) {
    logger.error({ maxCardId: raw.toString() }, "maxCardId out of range");
    throw new ApiError(500, "INTERNAL", "Invalid maxCardId value");
  }

  return value;
}

function normalizeCardTemplate(template: any): CardTemplate {
  return {
    cardId: Number(template.cardId),
    rarity: Number(template.rarity),
    cardType: Number(template.cardType),
    atkBase: Number(template.atkBase),
    defBase: Number(template.defBase),
    spdBase: Number(template.spdBase),
    hpBase: Number(template.hpBase),
    supplyCap: template.supplyCap.toString(),
    minted: template.minted.toString(),
    active: template.active === true || template.active === 1,
  };
}

/**
 * viem can return tuple values either as object-like named fields
 * or array-like tuple fields depending on ABI inference/runtime.
 */
function normalizePool(poolId: number, pool: any): PoolInfo {
  return {
    poolId,
    cardId: Number(pool.cardId ?? pool[0]),
    active: Boolean(pool.active ?? pool[3]),
  };
}

function isNotFoundLikeError(error: unknown): boolean {
  const message = String(error).toLowerCase();

  return (
    message.includes("revert") ||
    message.includes("not found") ||
    message.includes("invalid") ||
    message.includes("poolnotfound") ||
    message.includes("templatenotfound")
  );
}

/**
 * Fetch card template from CardRegistry.
 */
async function fetchCardTemplate(
  cardRegistry: `0x${string}`,
  cardId: number,
): Promise<CardTemplate | null> {
  try {
    const template = await publicClient.readContract({
      address: cardRegistry,
      abi: cardRegistryAbi,
      functionName: "getTemplate",
      args: [BigInt(cardId)],
    });

    return normalizeCardTemplate(template);
  } catch (error) {
    logger.warn({ cardId, error }, "Failed to fetch card template");
    return null;
  }
}

async function fetchCardTemplatesBatch(
  cardRegistry: `0x${string}`,
  cardIds: number[],
): Promise<(CardTemplate | null)[]> {
  const promises = cardIds.map((cardId) =>
    fetchCardTemplate(cardRegistry, cardId),
  );

  return Promise.all(promises);
}

/**
 * Fetch one marketplace pool.
 *
 * AMMMarketplace.getPool expects poolId.
 */
async function fetchPoolInfo(
  ammMarketplace: `0x${string}`,
  poolId: number,
): Promise<PoolInfo | null> {
  try {
    const pool = await publicClient.readContract({
      address: ammMarketplace,
      abi: ammMarketplaceAbi,
      functionName: "getPool",
      args: [BigInt(poolId)],
    });

    return normalizePool(poolId, pool);
  } catch (error) {
    logger.debug({ poolId, error }, "Failed to fetch pool");
    return null;
  }
}

async function fetchPoolInfosBatch(
  ammMarketplace: `0x${string}`,
  poolIds: number[],
): Promise<(PoolInfo | null)[]> {
  const promises = poolIds.map((poolId) =>
    fetchPoolInfo(ammMarketplace, poolId),
  );

  return Promise.all(promises);
}

/**
 * Fetch active pools from AMMMarketplace.
 *
 * We intentionally try pool ids from 0..totalPools.
 *
 * Why?
 * - Some contracts use 0-based pool ids: 0, 1, 2, ...
 * - Some use 1-based pool ids: 1, 2, 3, ...
 *
 * totalPools is a count, not necessarily the highest valid pool id.
 * Trying 0..totalPools covers both cases with only one extra read.
 */
async function getActivePools(
  ammMarketplace: `0x${string}`,
): Promise<PoolInfo[]> {
  let totalPools: bigint;

  try {
    totalPools = await publicClient.readContract({
      address: ammMarketplace,
      abi: ammMarketplaceAbi,
      functionName: "totalPools",
    });
  } catch (error) {
    // Pools are pricing enrichment, not the catalogue — CardRegistry is the
    // source of cards. Throwing here took the whole card list and every detail
    // page down whenever the public Arbitrum RPC rate-limited us, which is how
    // /cards/1 started returning RPC_ERROR. Degrade to "no pools": cards render
    // with poolId null and no buy/sell price, exactly as an unlisted card does.
    logger.error(
      { error },
      "Failed to fetch totalPools from AMMMarketplace — serving cards without pricing",
    );
    return [];
  }

  const total = Number(totalPools);

  if (!Number.isSafeInteger(total)) {
    logger.error({ totalPools: totalPools.toString() }, "totalPools too large");
    throw new ApiError(500, "INTERNAL", "Invalid totalPools value");
  }

  if (total === 0) {
    return [];
  }

  // Try 0..total inclusive to support both 0-based and 1-based ids.
  const candidatePoolIds = Array.from({ length: total + 1 }, (_, i) => i);

  const allPools: (PoolInfo | null)[] = [];

  for (let i = 0; i < candidatePoolIds.length; i += BATCH_SIZE) {
    const batch = candidatePoolIds.slice(i, i + BATCH_SIZE);
    const batchResults = await fetchPoolInfosBatch(ammMarketplace, batch);
    allPools.push(...batchResults);
  }

  const activePools = allPools.filter(
    (pool): pool is PoolInfo => pool !== null && pool.active === true,
  );

  logger.info(
    {
      totalPools: total,
      checkedPoolIds: candidatePoolIds,
      activePoolCount: activePools.length,
      activePools,
    },
    "Fetched active marketplace pools",
  );

  return activePools;
}

/**
 * Build one active pool per cardId.
 *
 * If one card has multiple active pools, this picks the first one found.
 * Later you can improve this by choosing the pool with highest liquidity.
 */
function buildPoolByCardId(activePools: PoolInfo[]): Map<number, PoolInfo> {
  const poolByCardId = new Map<number, PoolInfo>();

  for (const pool of activePools) {
    if (!poolByCardId.has(pool.cardId)) {
      poolByCardId.set(pool.cardId, pool);
    }
  }

  return poolByCardId;
}

async function findActivePoolIdByCardId(
  ammMarketplace: `0x${string}`,
  cardId: number,
): Promise<number | null> {
  const activePools = await getActivePools(ammMarketplace);

  const pool = activePools.find((item) => item.cardId === cardId);

  return pool?.poolId ?? null;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all active market card templates.
 *
 * Flow:
 * 1. Fetch marketplace pools.
 * 2. Extract cardId from each pool.
 * 3. Fetch CardRegistry template using cardId.
 * 4. Attach poolId to each card item.
 *
 * Important:
 * - totalPools counts pools, not card templates.
 * - getBuyPrice/getSellPrice use poolId, not cardId.
 */
export async function getAllTemplates(): Promise<[CardCatalogItem[], string]> {
  try {
    const cached = await cacheService.get<{
      templates: CardCatalogItem[];
      cachedAt: string;
    }>(CARDS_ALL_CACHE_KEY);

    if (cached !== null) {
      return [cached.templates, cached.cachedAt];
    }

    const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
    const cardRegistry = addresses.cardRegistry;
    const ammMarketplace = addresses.ammMarketplace;

    if (!cardRegistry || !ammMarketplace) {
      logger.error(
        { cardRegistry, ammMarketplace },
        "Contract addresses not configured",
      );

      throw new ApiError(
        500,
        "CONFIG_ERROR",
        "Contract addresses not configured",
      );
    }

    const cachedAt = new Date().toISOString();

    // The catalogue is the registry, not the marketplace. Deriving it from AMM pools meant
    // every registered card stayed invisible until someone seeded liquidity for it — and
    // since the AMM held no roles, createPool reverted, so the catalogue was always empty
    // despite 1000 registered cards. Pools are pricing enrichment, nothing more.
    const maxCardId = await getMaxCardId(cardRegistry);

    if (maxCardId === 0) {
      await cacheService.set(
        CARDS_ALL_CACHE_KEY,
        { templates: [], cachedAt },
        EMPTY_CARDS_CACHE_TTL,
      );

      return [[], cachedAt];
    }

    const activePools = await getActivePools(ammMarketplace);
    const poolByCardId = buildPoolByCardId(activePools);
    // Names are cosmetic: a metadata outage yields an empty map, never an error.
    const nameByCardId = await getCardNames();

    const cardIds = Array.from({ length: maxCardId }, (_, i) => i + 1);
    const activeTemplates: CardCatalogItem[] = [];

    for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
      const batchCardIds = cardIds.slice(i, i + BATCH_SIZE);
      const batchTemplates = await fetchCardTemplatesBatch(
        cardRegistry,
        batchCardIds,
      );

      batchTemplates.forEach((template, index) => {
        if (template === null || template.active !== true) {
          return;
        }

        const cardId = batchCardIds[index];

        activeTemplates.push({
          ...template,
          // null = not listed on the marketplace; pricing calls must be skipped.
          poolId: poolByCardId.get(cardId!)?.poolId ?? null,
          name: nameByCardId.get(cardId!) ?? null,
        });
      });
    }

    logger.info(
      {
        maxCardId,
        poolCount: activePools.length,
        activeTemplateCount: activeTemplates.length,
        listedCount: activeTemplates.filter((t) => t.poolId !== null).length,
      },
      "Fetched card catalog from CardRegistry",
    );

    await cacheService.set(
      CARDS_ALL_CACHE_KEY,
      { templates: activeTemplates, cachedAt },
      activeTemplates.length === 0
        ? EMPTY_CARDS_CACHE_TTL
        : CARDS_ALL_CACHE_TTL,
    );

    return [activeTemplates, cachedAt];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error({ error }, "cardService getAllTemplates error");

    throw new ApiError(500, "INTERNAL", "Failed to fetch card catalog");
  }
}

/**
 * Get paginated list of cards filtered by optional rarity.
 */
export async function getCardList(
  page: number,
  pageSize: number,
  rarity?: number,
): Promise<CardListResult> {
  const [allTemplates, cachedAt] = await getAllTemplates();

  let filtered = allTemplates;

  if (rarity !== undefined) {
    filtered = allTemplates.filter((card) => card.rarity === rarity);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = filtered.slice(startIndex, endIndex);

  return {
    data,
    total,
    page,
    pageSize,
    cachedAt,
  };
}

/**
 * Get detailed card information including buy/sell prices.
 *
 * Important:
 * - getTemplate uses cardId.
 * - getBuyPrice/getSellPrice use poolId.
 */
export async function getCardDetail(cardId: number): Promise<CardDetail> {
  const cacheKey = getCardCacheKey(cardId);

  try {
    const cached = await cacheService.get<CardDetail>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
    const cardRegistry = addresses.cardRegistry;
    const ammMarketplace = addresses.ammMarketplace;

    if (!cardRegistry || !ammMarketplace) {
      logger.error(
        { cardRegistry, ammMarketplace },
        "Contract addresses not configured",
      );

      throw new ApiError(
        500,
        "CONFIG_ERROR",
        "Contract addresses not configured",
      );
    }

    const [template, poolId] = await Promise.all([
      publicClient.readContract({
        address: cardRegistry,
        abi: cardRegistryAbi,
        functionName: "getTemplate",
        args: [BigInt(cardId)],
      }),
      findActivePoolIdByCardId(ammMarketplace, cardId),
    ]);

    const normalized = normalizeCardTemplate(template);

    // A zeroed struct means the read returned nothing. That happens for an
    // unregistered id — but also when the RPC rate-limits and answers 0x, which
    // viem decodes to zeros. Telling a real card "not found" is the worse error:
    // Next caches notFound() as a permanent 404 page.
    //
    // maxCardId separates the two. Inside the registered range the card exists
    // and the read failed, so report it as an upstream failure and let the
    // client retry.
    if (normalized.cardId !== cardId) {
      const maxCardId = await getMaxCardId(cardRegistry);

      if (cardId <= maxCardId) {
        logger.error(
          { cardId, maxCardId },
          "getTemplate returned an empty struct for a registered card — RPC failure",
        );

        throw new ApiError(
          503,
          "RPC_ERROR",
          "Card data is temporarily unavailable. Please retry.",
        );
      }

      throw new NotFoundError("Card not found");
    }

    if (!normalized.active) {
      throw new NotFoundError("Card not found");
    }

    // A registered card with no marketplace pool is a valid card, not a 404 — it simply
    // has no price. Throwing here made every card detail page unreachable.
    const prices =
      poolId === null
        ? null
        : await Promise.all([
            publicClient.readContract({
              address: ammMarketplace,
              abi: ammMarketplaceAbi,
              functionName: "getBuyPrice",
              args: [BigInt(poolId)],
            }),
            publicClient.readContract({
              address: ammMarketplace,
              abi: ammMarketplaceAbi,
              functionName: "getSellPrice",
              args: [BigInt(poolId)],
            }),
          ]);

    const detail: CardDetail = {
      ...normalized,
      poolId,
      name: (await getCardNames()).get(cardId) ?? null,
      buyPrice: prices === null ? null : (prices[0] as bigint).toString(),
      sellPrice: prices === null ? null : (prices[1] as bigint).toString(),
      cachedAt: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, detail, CARD_DETAIL_CACHE_TTL);

    return detail;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ApiError) {
      throw error;
    }

    if (isNotFoundLikeError(error)) {
      throw new NotFoundError("Card not found");
    }

    logger.error({ cardId, error }, "cardService getCardDetail error");

    throw new ApiError(500, "INTERNAL", "Failed to fetch card data");
  }
}
