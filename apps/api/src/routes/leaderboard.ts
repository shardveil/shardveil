/**
 * Leaderboard routes — read-only endpoints for rankings
 *
 * GET  /ranked?seasonId=<id>&limit=100
 * GET  /guilds?limit=50
 * GET  /crafters?limit=50
 */

import { Hono } from "hono";

import { ValidationError } from "../lib/errors";
import { leaderboardService } from "../services/leaderboardService";

/**
 * Parse and clamp limit query parameter
 *
 * @param raw - Raw query parameter value
 * @param max - Maximum allowed value (default: 100)
 * @returns Parsed limit or default/max value
 */
function parseLimit(raw: string | undefined, max = 100): number {
  const parsed = parseInt(raw ?? "", 10);
  return isNaN(parsed) || parsed <= 0 ? max : Math.min(parsed, max);
}

const leaderboardRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /ranked
// ---------------------------------------------------------------------------

/**
 * Get ranked leaderboard for a season sorted by seasonExp.
 *
 * Query params:
 * - seasonId (required): positive integer for the season
 * - limit (optional): max entries to return, clamped to 100
 */
leaderboardRouter.get("/ranked", async (c) => {
  const seasonIdStr = c.req.query("seasonId");
  const limitStr = c.req.query("limit");

  // Validate seasonId
  if (!seasonIdStr) {
    throw new ValidationError("seasonId must be a positive integer");
  }

  const seasonId = parseInt(seasonIdStr, 10);
  if (isNaN(seasonId) || seasonId <= 0) {
    throw new ValidationError("seasonId must be a positive integer");
  }

  const limit = parseLimit(limitStr);

  const result = await leaderboardService.getRanked(seasonId, limit);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /guilds
// ---------------------------------------------------------------------------

/**
 * Get guild leaderboard sorted by warWins.
 *
 * Query params:
 * - limit (optional): max guilds to return, clamped to 100
 */
leaderboardRouter.get("/guilds", async (c) => {
  const limitStr = c.req.query("limit");
  const limit = parseLimit(limitStr);

  const result = await leaderboardService.getGuilds(limit);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /crafters
// ---------------------------------------------------------------------------

/**
 * Get crafter leaderboard sorted by craftCount.
 *
 * Query params:
 * - limit (optional): max entries to return, clamped to 100
 */
leaderboardRouter.get("/crafters", async (c) => {
  const limitStr = c.req.query("limit");
  const limit = parseLimit(limitStr);

  const result = await leaderboardService.getCrafters(limit);
  return c.json(result);
});

export { leaderboardRouter };
