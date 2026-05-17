/**
 * Messages routes — Task 4.5
 *
 * REST endpoints to load chat history with cursor-based pagination.
 *
 * GET /messages/:address?before=<ISO timestamp>&limit=50
 *   → Load DM history between the authenticated user and :address
 *
 * The guild and global chat history endpoints live in social.ts.
 */

import { Hono } from "hono";

import { prisma } from "../config/database";
import { ValidationError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";

const messagesRouter = new Hono();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// GET /messages/:address — DM history
// ---------------------------------------------------------------------------

/**
 * Load DM history between the authenticated user and another player.
 *
 * Query parameters:
 *   before  (optional) — ISO 8601 timestamp; return messages created before this time
 *   limit   (optional) — max messages to return (default 50, max 100)
 *
 * Response: { messages: [...], nextCursor: string | null }
 */
messagesRouter.get("/:address", requireAuth, async (c) => {
  const myAddress = c.get("address");
  const theirAddress = c.req.param("address");

  // Validate Ethereum address format
  if (!/^0x[0-9a-fA-F]{40}$/i.test(theirAddress)) {
    throw new ValidationError("Invalid Ethereum address format");
  }

  const beforeParam = c.req.query("before");
  const limitParam = c.req.query("limit");

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

  // Fetch messages in both directions (A→B and B→A) between the two players
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: myAddress, receiverId: theirAddress },
        { senderId: theirAddress, receiverId: myAddress },
      ],
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
    },
  });

  const nextCursor =
    messages.length === limit
      ? messages[messages.length - 1]!.createdAt.toISOString()
      : null;

  return c.json({
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.senderId,
      receiver: m.receiverId,
      text: m.content,
      ts: m.createdAt.toISOString(),
    })),
    nextCursor,
  });
});

export { messagesRouter };
