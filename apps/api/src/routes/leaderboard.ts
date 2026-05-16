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

  // Parse and clamp limit
  let limit = 100; // default
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100); // clamp to 100
    }
  }

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

  // Parse and clamp limit
  let limit = 100; // default
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100); // clamp to 100
    }
  }

  const result = await leaderboardService.getGuilds(limit);
  return c.json(result);
});

// ---------------------------------------------------------------------------
// GET /crafters
// ---------------------------------------------------------------------------

/**
 * Get crafter leaderboard for a season sorted by craftCount.
 *
 * Query params:
 * - seasonId (required): positive integer for the season
 * - limit (optional): max entries to return, clamped to 100
 */
leaderboardRouter.get("/crafters", async (c) => {
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

  // Parse and clamp limit
  let limit = 100; // default
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100); // clamp to 100
    }
  }

  const result = await leaderboardService.getCrafters(seasonId, limit);
  return c.json(result);
});

export { leaderboardRouter };
