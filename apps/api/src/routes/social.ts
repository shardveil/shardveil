/**
 * Social routes — Task 4.5
 *
 * Chat history endpoints for guild and global chat rooms.
 * (Friend / social graph endpoints may be added in future tasks.)
 *
 * GET /social/guild/:guildId/messages?before&limit
 *   → Load guild chat history (authenticated + must be a member)
 *
 * GET /social/chat/global/:room?before&limit
 *   → Load global chat history (authenticated)
 */

import { Hono } from "hono";

import { prisma } from "../config/database";
import { ForbiddenError, NotFoundError, ValidationError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";

const socialRouter = new Hono();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ALLOWED_GLOBAL_ROOMS = new Set([
  "#general",
  "#trading",
  "#deck-advice",
  "#guild-recruitment",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePaginationParams(
  beforeParam: string | undefined,
  limitParam: string | undefined,
): { beforeDate: Date | undefined; limit: number } {
  let beforeDate: Date | undefined;
  if (beforeParam) {
    beforeDate = new Date(beforeParam);
    if (Number.isNaN(beforeDate.getTime())) {
      throw new ValidationError(
        "Invalid `before` timestamp — expected ISO 8601 format",
      );
    }
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT),
  );

  if (limitParam && Number.isNaN(parseInt(limitParam, 10))) {
    throw new ValidationError("Invalid `limit` parameter — expected integer");
  }

  return { beforeDate, limit };
}

// ---------------------------------------------------------------------------
// GET /guild/:guildId/messages — guild chat history
// ---------------------------------------------------------------------------

/**
 * Load guild chat history.
 * Requires authentication AND confirmed guild membership.
 *
 * Query parameters:
 *   before  (optional) — ISO 8601 timestamp cursor
 *   limit   (optional) — max messages to return (default 50, max 100)
 */
socialRouter.get("/guild/:guildId/messages", requireAuth, async (c) => {
  const address = c.get("address");
  const guildId = c.req.param("guildId");

  // Verify the guild exists
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { id: true },
  });
  if (!guild) {
    throw new NotFoundError("Guild not found");
  }

  // Verify membership
  const member = await prisma.guildMember.findUnique({
    where: { guildId_playerAddress: { guildId, playerAddress: address } },
    select: { id: true },
  });
  if (!member) {
    throw new ForbiddenError(
      "You must be a guild member to view this chat history",
    );
  }

  const { beforeDate, limit } = parsePaginationParams(
    c.req.query("before"),
    c.req.query("limit"),
  );

  const messages = await prisma.guildMessage.findMany({
    where: {
      guildId,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      senderAddress: true,
      content: true,
      createdAt: true,
    },
  });

  const nextCursor =
    messages.length === limit
      ? messages[messages.length - 1]!.createdAt.toISOString()
      : null;

  return c.json({
    guildId,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.senderAddress,
      text: m.content,
      ts: m.createdAt.toISOString(),
    })),
    nextCursor,
  });
});

// ---------------------------------------------------------------------------
// GET /chat/global/:room — global chat history
// ---------------------------------------------------------------------------

/**
 * Load global chat history for a specific room.
 * Requires authentication.
 *
 * Path parameter: room — one of #general, #trading, #deck-advice, #guild-recruitment
 * Query parameters:
 *   before  (optional) — ISO 8601 timestamp cursor
 *   limit   (optional) — max messages to return (default 50, max 100)
 */
socialRouter.get("/chat/global/:room", requireAuth, async (c) => {
  // Decode percent-encoded room name (e.g. %23general → #general)
  const roomParam = decodeURIComponent(c.req.param("room"));

  if (!ALLOWED_GLOBAL_ROOMS.has(roomParam)) {
    throw new ValidationError(
      `Invalid global room. Allowed: ${[...ALLOWED_GLOBAL_ROOMS].join(", ")}`,
    );
  }

  const { beforeDate, limit } = parsePaginationParams(
    c.req.query("before"),
    c.req.query("limit"),
  );

  const messages = await prisma.globalChatMessage.findMany({
    where: {
      room: roomParam,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      senderAddress: true,
      content: true,
      createdAt: true,
    },
  });

  const nextCursor =
    messages.length === limit
      ? messages[messages.length - 1]!.createdAt.toISOString()
      : null;

  return c.json({
    room: roomParam,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.senderAddress,
      text: m.content,
      ts: m.createdAt.toISOString(),
    })),
    nextCursor,
  });
});

export { socialRouter };
