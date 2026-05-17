/**
 * Notification routes — Task 4.4
 *
 * GET  /notifications                   requireAuth → paginated list
 * POST /notifications/mark-read         requireAuth → { ids } → marks specified as read
 * POST /notifications/mark-all-read     requireAuth → marks all as read
 * GET  /notifications/unread-count      requireAuth → { count }
 *
 * All endpoints require a valid JWT (via requireAuth middleware).
 */

import { Hono } from "hono";
import { z } from "zod";

import { ValidationError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import type { NotificationType } from "../services/notificationService";
import {
  create as _create,
  getUnreadCount,
  list,
  markAllRead,
  markRead,
} from "../services/notificationService";

// Re-export create so other modules (e.g. services) can use it via a single import.
export { _create as createNotification };

const notificationRouter = new Hono();

// Apply auth to all routes in this router
notificationRouter.use("*", requireAuth);

// ============================================================================
// Zod Schemas
// ============================================================================

const listQuerySchema = z.object({
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
      "FRIEND_REQUEST",
      "BATTLE_CHALLENGE",
      "TRADE_OFFER",
      "GUILD_INVITE",
      "ACHIEVEMENT",
      "SYSTEM",
    ])
    .optional(),
});

const markReadBodySchema = z.object({
  notificationIds: z
    .array(z.string().min(1))
    .min(1, "notificationIds must contain at least one entry"),
});

// ============================================================================
// GET /notifications
// ============================================================================

notificationRouter.get("/", async (c) => {
  const address = c.get("address");

  const queryResult = listQuerySchema.safeParse({
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

  const result = await list(address, {
    page,
    pageSize,
    ...(type ? { type: type as NotificationType } : {}),
  });

  return c.json(result);
});

// ============================================================================
// POST /notifications/mark-read
// ============================================================================

notificationRouter.post("/mark-read", async (c) => {
  const address = c.get("address");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  const parseResult = markReadBodySchema.safeParse(body);
  if (!parseResult.success) {
    const detail = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`Invalid request body: ${detail}`);
  }

  await markRead(address, parseResult.data.notificationIds);

  return c.json({ success: true });
});

// ============================================================================
// POST /notifications/mark-all-read
// ============================================================================

notificationRouter.post("/mark-all-read", async (c) => {
  const address = c.get("address");
  await markAllRead(address);
  return c.json({ success: true });
});

// ============================================================================
// GET /notifications/unread-count
// ============================================================================

notificationRouter.get("/unread-count", async (c) => {
  const address = c.get("address");
  const count = await getUnreadCount(address);
  return c.json({ count });
});

export { notificationRouter };
