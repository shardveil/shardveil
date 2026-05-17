/**
 * Chat Channel — Task 4.5
 *
 * Single channel handling three sub-types of chat rooms:
 *
 *   DM      — room id: `dm:<addrA>:<addrB>` (addresses sorted lexicographically)
 *   GLOBAL  — room id: one of `#general`, `#trading`, `#deck-advice`, `#guild-recruitment`
 *   GUILD   — room id: `guild:<guildId>` (only confirmed guild members may subscribe)
 *
 * Inbound message types:
 *   JOIN_ROOM  — subscribe socket to a room
 *   LEAVE_ROOM — unsubscribe socket from a room
 *   SEND       — send a chat message to the current room
 *   TYPING     — broadcast typing indicator to the room
 *
 * Outbound message types:
 *   JOINED       — acknowledgement of successful room join
 *   LEFT         — acknowledgement of room leave
 *   MESSAGE      — a chat message delivered to the room
 *   TYPING_STATE — typing indicator broadcast
 *   MUTED        — rate-limit rejection (1 msg / 3 s per address per room)
 *
 * Rate limiting: Redis key `ws:chat:rl:{address}:{roomId}` with 3 s TTL.
 * Persistence:
 *   DM     → DirectMessage table
 *   GUILD  → GuildMessage table
 *   GLOBAL → GlobalChatMessage table (7-day retention via cron)
 *
 * Moderation: toxic-word filter — flags but does not block.
 */

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import { z } from "zod";

import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import type { Address } from "../../config/viem";
import { filterContent } from "../../services/moderationService";
import { connectionManager } from "../connectionManager";
import type { WsEnvelope } from "../messageRouter";
import { messageRouter } from "../messageRouter";

type Socket = WSContext<WebSocket>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_SECONDS = 3;
const ALLOWED_GLOBAL_ROOMS = new Set([
  "#general",
  "#trading",
  "#deck-advice",
  "#guild-recruitment",
]);

// ---------------------------------------------------------------------------
// Zod payload schemas
// ---------------------------------------------------------------------------

const JoinRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
  /** Optional: DM target address (used to build DM room id from the server side) */
  targetAddress: z.string().optional(),
});

const LeaveRoomPayloadSchema = z.object({
  roomId: z.string().min(1),
});

const SendPayloadSchema = z.object({
  roomId: z.string().min(1),
  text: z.string().min(1).max(500),
});

const TypingPayloadSchema = z.object({
  roomId: z.string().min(1),
  isTyping: z.boolean(),
});

// ---------------------------------------------------------------------------
// Outbound message builders
// ---------------------------------------------------------------------------

function buildJoinedMessage(roomId: string): string {
  return JSON.stringify({
    channel: "chat",
    type: "JOINED",
    payload: { roomId },
  });
}

function buildLeftMessage(roomId: string): string {
  return JSON.stringify({
    channel: "chat",
    type: "LEFT",
    payload: { roomId },
  });
}

function buildChatMessage(
  roomId: string,
  sender: string,
  text: string,
  ts: string,
  isModerated: boolean,
): string {
  return JSON.stringify({
    channel: "chat",
    type: "MESSAGE",
    payload: { roomId, sender, text, ts, isModerated },
  });
}

function buildTypingState(
  roomId: string,
  sender: string,
  isTyping: boolean,
): string {
  return JSON.stringify({
    channel: "chat",
    type: "TYPING_STATE",
    payload: { roomId, sender, isTyping },
  });
}

function buildMutedMessage(roomId: string, retryAfterMs: number): string {
  return JSON.stringify({
    channel: "chat",
    type: "MUTED",
    payload: { roomId, retryAfterMs },
  });
}

function buildErrorMessage(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } });
}

function safeSend(socket: Socket, message: string): void {
  try {
    socket.send(message);
  } catch {
    // Socket already closed — ignore
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a DM room id from two addresses (sorted lexicographically).
 */
function dmRoomId(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `dm:${first}:${second}`;
}

/**
 * Determine the sub-type of a room by its id.
 * Returns null if the room id is not valid for any sub-type.
 */
type RoomType = "DM" | "GLOBAL" | "GUILD";

function classifyRoom(roomId: string): RoomType | null {
  if (roomId.startsWith("dm:")) return "DM";
  if (ALLOWED_GLOBAL_ROOMS.has(roomId)) return "GLOBAL";
  if (roomId.startsWith("guild:")) return "GUILD";
  return null;
}

/**
 * Extract guildId from a guild room id (`guild:<guildId>`).
 */
function extractGuildId(roomId: string): string {
  return roomId.slice("guild:".length);
}

/**
 * Check if `address` is a confirmed member of `guildId`.
 */
async function isGuildMember(
  address: Address,
  guildId: string,
): Promise<boolean> {
  const member = await prisma.guildMember.findUnique({
    where: { guildId_playerAddress: { guildId, playerAddress: address } },
    select: { id: true },
  });
  return member !== null;
}

/**
 * Check and enforce per-address-per-room rate limit (1 msg / 3 s).
 * Returns true if the message is allowed, false if rate-limited.
 */
async function checkChatRateLimit(
  address: Address,
  roomId: string,
): Promise<boolean> {
  const key = `ws:chat:rl:${address}:${roomId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // First message in this window — set TTL
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  }
  return count <= 1;
}

// ---------------------------------------------------------------------------
// JOIN_ROOM handler
// ---------------------------------------------------------------------------

async function handleJoinRoom(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = JoinRoomPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMessage("INVALID_PAYLOAD", "JOIN_ROOM requires a roomId"),
    );
    return;
  }

  let { roomId } = parsed.data;
  const { targetAddress } = parsed.data;

  // If client provides targetAddress, build a canonical DM room id
  if (targetAddress) {
    roomId = dmRoomId(address, targetAddress);
  }

  const roomType = classifyRoom(roomId);
  if (roomType === null) {
    safeSend(
      socket,
      buildErrorMessage(
        "INVALID_ROOM",
        `Unknown room: ${roomId}. DM rooms must start with "dm:", guild rooms with "guild:", or use a valid global room name.`,
      ),
    );
    return;
  }

  // Guild: verify membership before allowing subscribe
  if (roomType === "GUILD") {
    const guildId = extractGuildId(roomId);
    const member = await isGuildMember(address, guildId);
    if (!member) {
      safeSend(
        socket,
        buildErrorMessage(
          "FORBIDDEN",
          "You must be a guild member to join this room",
        ),
      );
      return;
    }
  }

  connectionManager.joinRoom(socket, roomId);
  safeSend(socket, buildJoinedMessage(roomId));
  logger.debug({ address, roomId, roomType }, "chat: joined room");
}

// ---------------------------------------------------------------------------
// LEAVE_ROOM handler
// ---------------------------------------------------------------------------

function handleLeaveRoom(
  socket: Socket,
  address: Address,
  payload: unknown,
): void {
  const parsed = LeaveRoomPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMessage("INVALID_PAYLOAD", "LEAVE_ROOM requires a roomId"),
    );
    return;
  }

  const { roomId } = parsed.data;
  connectionManager.leaveRoom(socket, roomId);
  safeSend(socket, buildLeftMessage(roomId));
  logger.debug({ address, roomId }, "chat: left room");
}

// ---------------------------------------------------------------------------
// SEND handler
// ---------------------------------------------------------------------------

async function handleSend(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = SendPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMessage(
        "INVALID_PAYLOAD",
        "SEND requires roomId and text (max 500 chars)",
      ),
    );
    return;
  }

  const { roomId, text } = parsed.data;

  const roomType = classifyRoom(roomId);
  if (roomType === null) {
    safeSend(
      socket,
      buildErrorMessage("INVALID_ROOM", `Unknown room: ${roomId}`),
    );
    return;
  }

  // Guild: verify membership before allowing send
  if (roomType === "GUILD") {
    const guildId = extractGuildId(roomId);
    const member = await isGuildMember(address, guildId);
    if (!member) {
      safeSend(
        socket,
        buildErrorMessage(
          "FORBIDDEN",
          "You must be a guild member to send messages in this room",
        ),
      );
      return;
    }
  }

  // Rate limiting
  const allowed = await checkChatRateLimit(address, roomId);
  if (!allowed) {
    safeSend(
      socket,
      buildMutedMessage(roomId, RATE_LIMIT_WINDOW_SECONDS * 1000),
    );
    logger.debug({ address, roomId }, "chat: rate limit exceeded");
    return;
  }

  // Moderation
  const { clean, flagged } = await filterContent(text);

  const ts = new Date().toISOString();

  // Persist to DB
  try {
    if (roomType === "DM") {
      // Extract receiver from DM room id: `dm:<addrA>:<addrB>`
      // Addresses contain no colons, so split yields ["dm", addr1, addr2]
      const [, addr1, addr2] = roomId.split(":");
      const receiverId = addr1 === address ? addr2 : addr1;
      if (!receiverId) {
        throw new Error(`Cannot parse receiver from DM room id: ${roomId}`);
      }

      await prisma.directMessage.create({
        data: {
          senderId: address,
          receiverId,
          content: clean,
        },
      });
    } else if (roomType === "GUILD") {
      const guildId = extractGuildId(roomId);
      await prisma.guildMessage.create({
        data: {
          guildId,
          senderAddress: address,
          content: clean,
        },
      });
    } else {
      // GLOBAL
      await prisma.globalChatMessage.create({
        data: {
          room: roomId,
          senderAddress: address,
          content: clean,
        },
      });
    }
  } catch (err) {
    logger.error(
      {
        address,
        roomId,
        error: err instanceof Error ? err.message : String(err),
      },
      "chat: failed to persist message",
    );
    // Do not block delivery even if persistence fails
  }

  // Broadcast to room
  const outbound = buildChatMessage(roomId, address, clean, ts, flagged);
  connectionManager.sendToRoom(roomId, outbound);

  // For DMs: also ensure the sender receives the message on all their sockets
  // (sendToRoom already covers sockets subscribed to that room, but the
  // recipient may not be in the room if they're offline — that's fine; stored.)
  logger.debug({ address, roomId, flagged }, "chat: message sent");
}

// ---------------------------------------------------------------------------
// TYPING handler
// ---------------------------------------------------------------------------

function handleTyping(
  socket: Socket,
  address: Address,
  payload: unknown,
): void {
  const parsed = TypingPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMessage(
        "INVALID_PAYLOAD",
        "TYPING requires roomId and isTyping (boolean)",
      ),
    );
    return;
  }

  const { roomId, isTyping } = parsed.data;

  // Broadcast typing state to room (except sender — they already know)
  connectionManager.sendToRoom(
    roomId,
    buildTypingState(roomId, address, isTyping),
  );
}

// ---------------------------------------------------------------------------
// Channel handler (dispatches by message type)
// ---------------------------------------------------------------------------

async function chatChannelHandler(
  socket: Socket,
  address: Address,
  message: WsEnvelope,
): Promise<void> {
  switch (message.type) {
    case "JOIN_ROOM":
      await handleJoinRoom(socket, address, message.payload);
      break;

    case "LEAVE_ROOM":
      handleLeaveRoom(socket, address, message.payload);
      break;

    case "SEND":
      await handleSend(socket, address, message.payload);
      break;

    case "TYPING":
      handleTyping(socket, address, message.payload);
      break;

    default:
      safeSend(
        socket,
        buildErrorMessage(
          "UNKNOWN_TYPE",
          `Unknown chat message type: ${message.type}`,
        ),
      );
      logger.debug(
        { address, type: message.type },
        "chat channel: unknown message type",
      );
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the chat channel handler with the message router.
 * Call this once at application startup (from wsServer.ts).
 */
export function registerChatChannel(): void {
  messageRouter.register("chat", chatChannelHandler);
  logger.info("chat channel registered");
}
