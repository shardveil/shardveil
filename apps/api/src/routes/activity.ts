/**
 * Activity routes
 *
 * GET    /activity/feed            requireAuth → paginated friend feed
 * POST   /activity/:id/like        requireAuth → like an activity
 * DELETE /activity/:id/like        requireAuth → remove that like
 *
 * activityService existed with no HTTP surface at all: activities were written
 * by the indexer and the activity worker and pushed over WS, but nothing could
 * read the feed back or like anything. These are the missing routes.
 *
 * All endpoints require a valid JWT (via requireAuth middleware).
 */

import { Hono } from "hono";
import { z } from "zod";

import { prisma } from "../config/database";
import { NotFoundError, ValidationError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { activityService } from "../services/activityService";

const activityRouter = new Hono();

// Apply auth to all routes in this router
activityRouter.use("*", requireAuth);

// ============================================================================
// Zod Schemas
// ============================================================================

const feedQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  type: z
    .enum([
      "PACK_OPENED",
      "BATTLE_WON",
      "BATTLE_LOST",
      "CARD_CRAFTED",
      "CARD_TRADED",
      "GUILD_JOINED",
    ])
    .optional(),
});

// ============================================================================
// GET /activity/feed
// ============================================================================

activityRouter.get("/feed", async (c) => {
  const address = c.get("address");

  const queryResult = feedQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    type: c.req.query("type"),
  });

  if (!queryResult.success) {
    const detail = queryResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`Invalid query parameters: ${detail}`);
  }

  const { page, pageSize, type } = queryResult.data;

  const activities = await activityService.getFeed(address, {
    page,
    pageSize,
    ...(type ? { type } : {}),
  });

  return c.json({
    activities,
    page,
    pageSize,
    // getFeed takes exactly pageSize rows, so a short page is the last one.
    hasMore: activities.length === pageSize,
  });
});

// ============================================================================
// POST /activity/:id/like  ·  DELETE /activity/:id/like
// ============================================================================

/**
 * Resolve the activity id from the path, 404ing when it does not exist.
 *
 * Without this an unknown id would still SADD, creating a like set for an
 * activity that never existed — a Redis key nothing would ever clean up.
 */
async function requireActivityId(id: string | undefined): Promise<string> {
  if (!id) {
    throw new ValidationError("Activity id is required");
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!activity) {
    throw new NotFoundError("Activity not found");
  }

  return activity.id;
}

activityRouter.post("/:id/like", async (c) => {
  const address = c.get("address");
  const activityId = await requireActivityId(c.req.param("id"));

  await activityService.like(activityId, address);

  return c.json({ success: true });
});

activityRouter.delete("/:id/like", async (c) => {
  const address = c.get("address");
  const activityId = await requireActivityId(c.req.param("id"));

  await activityService.unlike(activityId, address);

  return c.json({ success: true });
});

export { activityRouter };
