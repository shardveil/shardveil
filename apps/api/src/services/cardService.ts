/**
 * Card service — reads card templates and pricing from on-chain contracts.
 *
 * Manages card catalog data fetched from:
 * - cardRegistry: template data (stats, rarity, supply)
 * - ammMarketplace: buy/sell prices for each card
 *
 * Cache keys:
 *   - cards:all → full card template list (all active cards), TTL 24h (86400s)
 *   - cards:{cardId} → single card detail with prices, TTL 5min (300s)
 */

import { cacheService } from "./cacheService";
import { publicClient } from "../config/viem";
import { logger } from "../config/logger";
import { NotFoundError } from "../lib/errors";
import {
  cardRegistryAbi,
  ammMarketplaceAbi,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  getAddresses,
} from "@shardveil/contracts";

// ============================================================================
// Types
// ============================================================================

export interface CardTemplate {
  cardId: number;
  rarity: number; // 0-4: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
  cardType: number;
  atkBase: number;
  defBase: number;
  spdBase: number;
  hpBase: number;
  supplyCap: number;
  minted: number;
  active: boolean;
}

export interface CardDetail extends CardTemplate {
  buyPrice: string; // BigInt as string (SHARD wei)
  sellPrice: string; // BigInt as string (SHARD wei)
  cachedAt: string; // ISO 8601 timestamp
}

export interface CardListResult {
  data: CardTemplate[];
  total: number;
  page: number;
  pageSize: number;
  cachedAt: string; // ISO 8601 timestamp
}

// ============================================================================
// Constants
// ============================================================================

const CARDS_ALL_CACHE_KEY = "cards:all";
const CARDS_ALL_CACHE_TTL = 86400; // 24 hours

const CARD_DETAIL_CACHE_TTL = 300; // 5 minutes

// Batch size for parallel reads (prevent RPC overload)
const BATCH_SIZE = 20;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get cache key for a single card detail.
 */
function getCardCacheKey(cardId: number): string {
  return `cards:${cardId}`;
}

/**
 * Convert on-chain CardTemplate (with BigInts) to plain object with numbers.
 */
function normalizeCardTemplate(template: any): CardTemplate {
  return {
    cardId: Number(template.cardId),
    rarity: Number(template.rarity),
    cardType: Number(template.cardType),
    atkBase: Number(template.atkBase),
    defBase: Number(template.defBase),
    spdBase: Number(template.spdBase),
    hpBase: Number(template.hpBase),
    supplyCap: Number(template.supplyCap),
    minted: Number(template.minted),
    active: template.active === true || template.active === 1,
  };
}

/**
 * Fetch card template from on-chain cardRegistry.
 * Returns null if contract call fails (graceful degradation).
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
    logger.debug({ cardId, error }, "Failed to fetch card template");
    return null;
  }
}

/**
 * Batch fetch card templates in parallel with size limit.
 */
async function fetchCardTemplatesBatch(
  cardRegistry: `0x${string}`,
  cardIds: number[],
): Promise<(CardTemplate | null)[]> {
  const promises = cardIds.map((id) =>
    fetchCardTemplate(cardRegistry, id).catch(() => null),
  );
  return Promise.all(promises);
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Get all active card templates.
 *
 * Cached under "cards:all" for 24 hours.
 * On cache miss:
 *   1. Fetch total pool count from ammMarketplace
 *   2. Fetch all card templates in parallel (batches of 20)
 *   3. Filter out inactive cards
 *   4. Return normalized templates
 *
 * On any error: logs and returns empty array (graceful degradation).
 *
 * @returns Array of active CardTemplate objects
 */
export async function getAllTemplates(): Promise<CardTemplate[]> {
  try {
    // Try cache first
    const cached = await cacheService.get<CardTemplate[]>(
      CARDS_ALL_CACHE_KEY,
    );
    if (cached !== null) {
      return cached;
    }

    // Cache miss — fetch from contracts
    const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
    const cardRegistry = addresses.cardRegistry;
    const ammMarketplace = addresses.ammMarketplace;

    if (!cardRegistry || !ammMarketplace) {
      logger.error("Contract addresses not configured");
      return [];
    }

    // Get total card count
    let totalPools: bigint;
    try {
      totalPools = await publicClient.readContract({
        address: ammMarketplace,
        abi: ammMarketplaceAbi,
        functionName: "totalPools",
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch totalPools from ammMarketplace");
      return [];
    }

    const total = Number(totalPools);
    if (total === 0) {
      await cacheService.set(CARDS_ALL_CACHE_KEY, [], CARDS_ALL_CACHE_TTL);
      return [];
    }

    // Generate card IDs (1-indexed)
    const cardIds = Array.from({ length: total }, (_, i) => i + 1);

    // Fetch templates in batches
    const allTemplates: (CardTemplate | null)[] = [];
    for (let i = 0; i < cardIds.length; i += BATCH_SIZE) {
      const batch = cardIds.slice(i, i + BATCH_SIZE);
      const batchResults = await fetchCardTemplatesBatch(cardRegistry, batch);
      allTemplates.push(...batchResults);
    }

    // Filter out null results and inactive cards
    const activeTemplates = allTemplates.filter(
      (t): t is CardTemplate => t !== null && t.active === true,
    );

    // Cache the result
    await cacheService.set(
      CARDS_ALL_CACHE_KEY,
      activeTemplates,
      CARDS_ALL_CACHE_TTL,
    );

    return activeTemplates;
  } catch (error) {
    logger.error({ error }, "cardService getAllTemplates error");
    return [];
  }
}

/**
 * Get paginated list of card templates filtered by optional rarity.
 *
 * Uses getAllTemplates() from cache and applies pagination.
 *
 * @param page - 1-indexed page number (default 1)
 * @param pageSize - Results per page (default 20, max 100)
 * @param rarity - Optional rarity filter (0-4)
 * @returns CardListResult with paginated data
 */
export async function getCardList(
  page: number,
  pageSize: number,
  rarity?: number,
): Promise<CardListResult> {
  const allTemplates = await getAllTemplates();

  // Filter by rarity if provided
  let filtered = allTemplates;
  if (rarity !== undefined) {
    filtered = allTemplates.filter((card) => card.rarity === rarity);
  }

  // Calculate pagination
  const total = filtered.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = filtered.slice(startIndex, endIndex);

  return {
    data,
    total,
    page,
    pageSize,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Get detailed card information including prices.
 *
 * Cached under "cards:{cardId}" for 5 minutes.
 * On cache miss: fetches template + buy/sell prices in parallel.
 * Throws NotFoundError if card not found or inactive.
 *
 * @param cardId - Card ID (1-indexed)
 * @returns CardDetail with template + prices
 * @throws NotFoundError if card not found or inactive
 */
export async function getCardDetail(cardId: number): Promise<CardDetail> {
  const cacheKey = getCardCacheKey(cardId);

  try {
    // Try cache first
    const cached = await cacheService.get<CardDetail>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss — fetch from contracts
    const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
    const cardRegistry = addresses.cardRegistry;
    const ammMarketplace = addresses.ammMarketplace;

    if (!cardRegistry || !ammMarketplace) {
      throw new NotFoundError("Card not found");
    }

    // Fetch template and prices in parallel
    const [template, buyPrice, sellPrice] = await Promise.all([
      publicClient.readContract({
        address: cardRegistry,
        abi: cardRegistryAbi,
        functionName: "getTemplate",
        args: [BigInt(cardId)],
      }),
      publicClient.readContract({
        address: ammMarketplace,
        abi: ammMarketplaceAbi,
        functionName: "getBuyPrice",
        args: [BigInt(cardId)],
      }),
      publicClient.readContract({
        address: ammMarketplace,
        abi: ammMarketplaceAbi,
        functionName: "getSellPrice",
        args: [BigInt(cardId)],
      }),
    ]);

    // Normalize template
    const normalized = normalizeCardTemplate(template);

    // Check if card is active
    if (!normalized.active) {
      throw new NotFoundError("Card not found");
    }

    // Build detail response
    const detail: CardDetail = {
      ...normalized,
      buyPrice: (buyPrice as bigint).toString(),
      sellPrice: (sellPrice as bigint).toString(),
      cachedAt: new Date().toISOString(),
    };

    // Cache the result
    await cacheService.set(cacheKey, detail, CARD_DETAIL_CACHE_TTL);

    return detail;
  } catch (error) {
    // Re-throw NotFoundError as-is
    if (error instanceof NotFoundError) {
      throw error;
    }

    // Check for on-chain "not found" style errors
    const errorMessage = String(error).toLowerCase();
    if (
      errorMessage.includes("revert") ||
      errorMessage.includes("not found") ||
      errorMessage.includes("invalid")
    ) {
      throw new NotFoundError("Card not found");
    }

    logger.error({ cardId, error }, "cardService getCardDetail error");
    throw new NotFoundError("Card not found");
  }
}
