/**
 * Cards catalog routes — public endpoints for browsing card templates and pricing
 *
 * GET /              — list all cards with optional filtering by rarity
 * GET /:cardId       — single card detail with prices
 * GET /:cardId/holders   — card holders (stub, indexer not ready)
 * GET /:cardId/price-history — price history (stub, data not available)
 */

import { type CardRarity } from "@shardveil/shared";
import { Hono } from "hono";

import { ValidationError } from "../lib/errors";
import { getCardDetail, getCardList } from "../services/cardService";

const cardsRouter = new Hono();

// ============================================================================
// Helper: Parse and validate query/path parameters
// ============================================================================

/**
 * Parse and validate a positive integer from string.
 * Throws ValidationError if not a valid positive integer.
 */
function parsePositiveInt(
  value: string | undefined,
  fieldName: string,
): number | undefined {
  if (value === undefined) return undefined;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

/**
 * Parse rarity (0-5) from string.
 * Throws ValidationError if not in valid range.
 */

function parseRarity(value?: string): number | undefined {
  const rarityMap: Record<CardRarity, number> = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4,
    MYTHIC: 5,
  };

  if (value === undefined) return undefined;
  if (!(value in rarityMap)) {
    throw new ValidationError(
      "rarity must be one of: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC",
    );
  }

  return rarityMap[value as CardRarity];
}

/**
 * Parse pagination page number.
 * Defaults to 1, validates >= 1.
 */
function parsePage(value: string | undefined): number {
  if (value === undefined) return 1;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new ValidationError("Page must be >= 1");
  }

  return parsed;
}

/**
 * Parse pagination page size.
 * Defaults to 20, clamped to max 100.
 */
function parsePageSize(value: string | undefined): number {
  const DEFAULT_PAGE_SIZE = 20;
  const MAX_PAGE_SIZE = 100;

  if (value === undefined) return DEFAULT_PAGE_SIZE;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new ValidationError("pageSize must be >= 1");
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
}

// ============================================================================
// GET /
// ============================================================================

/**
 * List all cards with optional filtering by rarity and pagination.
 *
 * Query parameters:
 *   - rarity: optional, 0-4 (COMMON to LEGENDARY)
 *   - page: optional, default 1, min 1
 *   - pageSize: optional, default 20, max 100
 *
 * Returns: CardListResult with paginated data and cached timestamp
 */
cardsRouter.get("/", async (c) => {
  const rarity = parseRarity(c.req.query("rarity"));
  const page = parsePage(c.req.query("page"));
  const pageSize = parsePageSize(c.req.query("pageSize"));

  const result = await getCardList(page, pageSize, rarity);

  c.header("Cache-Control", "public, max-age=60");
  return c.json(result);
});

// ============================================================================
// GET /:cardId
// ============================================================================

/**
 * Get single card detail by card ID.
 * Includes template data and current buy/sell prices.
 *
 * Path parameter:
 *   - cardId: positive integer
 *
 * Returns: CardDetail with template, prices, and cached timestamp
 * Throws: NotFoundError if card not found or inactive
 */
cardsRouter.get("/:cardId", async (c) => {
  const cardId = parsePositiveInt(c.req.param("cardId"), "cardId");

  if (cardId === undefined) {
    throw new ValidationError("cardId is required");
  }

  const detail = await getCardDetail(cardId);

  c.header("Cache-Control", "public, max-age=300");
  return c.json(detail);
});

// ============================================================================
// GET /:cardId/holders
// ============================================================================

/**
 * Get holders of a specific card (stub).
 *
 * Indexer not yet implemented. Returns empty result.
 * To be filled in Module 03.
 *
 * Query parameters:
 *   - limit: optional, default 20, max 100
 *
 * Returns: { data: [], total: 0 }
 */
cardsRouter.get("/:cardId/holders", async (c) => {
  const cardId = parsePositiveInt(c.req.param("cardId"), "cardId");

  if (cardId === undefined) {
    throw new ValidationError("cardId is required");
  }

  // Verify card exists (indexer stub, no real data)
  await getCardDetail(cardId);

  c.header("Cache-Control", "public, max-age=60");
  return c.json({
    data: [],
    total: 0,
  });
});

// ============================================================================
// GET /:cardId/price-history
// ============================================================================

/**
 * Get price history for a specific card (stub).
 *
 * Historical price data not yet available. Returns empty result.
 * To be filled in Module 03.
 *
 * Query parameters:
 *   - range: optional, one of: 24h, 7d, 30d (default: 24h)
 *
 * Returns: { data: [] }
 */
cardsRouter.get("/:cardId/price-history", async (c) => {
  const cardId = parsePositiveInt(c.req.param("cardId"), "cardId");
  const range = c.req.query("range") || "24h";

  if (cardId === undefined) {
    throw new ValidationError("cardId is required");
  }

  // Validate range parameter
  if (!["24h", "7d", "30d"].includes(range)) {
    throw new ValidationError("range must be one of: 24h, 7d, 30d");
  }

  // Verify card exists (stub for price history, no real data)
  await getCardDetail(cardId);

  c.header("Cache-Control", "public, max-age=60");
  return c.json({
    data: [],
  });
});

export { cardsRouter };
