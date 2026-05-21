/**
 * Presence Channel — Task 4.3
 *
 * Allows authenticated clients to subscribe to the online/offline status of
 * their confirmed friends and receive real-time push updates.
 *
 * Protocol
 * --------
 * Inbound (SUBSCRIBE):
 *   { channel: 'presence', type: 'SUBSCRIBE', payload: { addresses: string[] } }
 *
 * Outbound (STATUS):
 *   { channel: 'presence', type: 'STATUS', payload: { address: string, online: boolean } }
 *
 * Outbound (ERROR):
 *   { error: { code: string, message: string } }
 *
 * Implementation details
 * ----------------------
 * - Each subscribing socket gets an independent polling interval (10 s) that
 *   checks the `presence:{address}` Redis keys for all addresses it cares about.
 * - Only confirmed friends (`Friend` table, status implied by existence) are
 *   allowed; non-friends are filtered out and the client receives an error.
 * - On disconnect (`unregister` is called by connectionManager) the polling
 *   interval is automatically cleared via a WeakMap entry.
 * - Multiple sockets belonging to the same subscriber address each run their
 *   own interval; this is intentional since each socket may subscribe to a
 *   different subset of addresses.
 */

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import { z } from "zod";

import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import type { Address } from "../../config/viem";
import type { WsEnvelope } from "../messageRouter";
import { messageRouter } from "../messageRouter";

type Socket = WSContext<WebSocket>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often to poll Redis for presence changes (ms). */
const POLL_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Inbound payload schema
// ---------------------------------------------------------------------------

const SubscribePayloadSchema = z.object({
  addresses: z
    .array(z.string().min(1))
    .min(1, "addresses must contain at least one entry")
    .max(100, "addresses list must not exceed 100 entries"),
});

// ---------------------------------------------------------------------------
// Outbound message helpers
// ---------------------------------------------------------------------------

interface StatusPayload {
  address: string;
  online: boolean;
}

function buildStatusMessage(payload: StatusPayload): string {
  return JSON.stringify({
    channel: "presence",
    type: "STATUS",
    payload,
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
// Subscription state
//
// We track per-socket poll timers in a WeakMap so they are automatically
// garbage-collected when the socket is GC'd (after connectionManager removes
// all references to it).
// ---------------------------------------------------------------------------

/** Map from socket → interval handle for that socket's presence poller. */
const socketPollers = new WeakMap<Socket, ReturnType<typeof setInterval>>();

/**
 * Map from socket → last-known presence states so we only push diffs.
 * Value is a Map<address, online>.
 */
const socketLastState = new WeakMap<Socket, Map<string, boolean>>();

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the current online/offline status for a batch of addresses.
 * Returns a Map<address, online>.
 */
async function getBatchPresenceStatus(
  addresses: string[],
): Promise<Map<string, boolean>> {
  if (addresses.length === 0) {
    return new Map();
  }

  const keys = addresses.map((a) => `presence:${a}`);
  const values = await redis.mget(...keys);

  const result = new Map<string, boolean>();
  for (let i = 0; i < addresses.length; i++) {
    result.set(addresses[i]!, values[i] !== null && values[i] !== undefined);
  }
  return result;
}

// ---------------------------------------------------------------------------
// DB friendship validation
// ---------------------------------------------------------------------------

/**
 * Given a subscriber address and a list of candidate addresses, return only
 * those that are confirmed friends of the subscriber.
 *
 * The `Friend` table is symmetric (both directions are stored), so a single
 * query on `playerId = subscriber` with `friendId IN candidates` suffices.
 */
async function filterConfirmedFriends(
  subscriberAddress: Address,
  candidateAddresses: string[],
): Promise<string[]> {
  if (candidateAddresses.length === 0) {
    return [];
  }

  const rows = await prisma.friend.findMany({
    where: {
      playerId: subscriberAddress,
      friendId: { in: candidateAddresses },
    },
    select: { friendId: true },
  });

  return rows.map((r) => r.friendId);
}

// ---------------------------------------------------------------------------
// Polling logic
// ---------------------------------------------------------------------------

/** Stop the polling interval for a socket (no-op if none running). */
function stopPolling(socket: Socket): void {
  const existing = socketPollers.get(socket);
  if (existing !== undefined) {
    clearInterval(existing);
    socketPollers.delete(socket);
    socketLastState.delete(socket);
  }
}

// ---------------------------------------------------------------------------
// SUBSCRIBE handler
// ---------------------------------------------------------------------------

async function handleSubscribe(
  socket: Socket,
  subscriberAddress: Address,
  rawPayload: unknown,
): Promise<void> {
  // Validate payload
  const parseResult = SubscribePayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    const detail = parseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    safeSend(
      socket,
      buildErrorMessage("INVALID_PAYLOAD", `Invalid payload: ${detail}`),
    );
    return;
  }

  const { addresses: requestedAddresses } = parseResult.data;

  // Validate friendship for all requested addresses
  const confirmedFriends = await filterConfirmedFriends(
    subscriberAddress,
    requestedAddresses,
  );

  // Reject non-friends
  const rejectedAddresses = requestedAddresses.filter(
    (a) => !confirmedFriends.includes(a),
  );
  if (rejectedAddresses.length > 0) {
    safeSend(
      socket,
      buildErrorMessage(
        "NOT_FRIEND",
        `Cannot subscribe to non-friend addresses: ${rejectedAddresses.join(", ")}`,
      ),
    );
    // Proceed only with confirmed friends — do NOT abort entirely so that
    // partial subscriptions (a mix of friends and non-friends) still work.
    if (confirmedFriends.length === 0) {
      return;
    }
  }

  // Send initial snapshot
  const initialStatuses = await getBatchPresenceStatus(confirmedFriends);
  for (const [address, online] of initialStatuses) {
    safeSend(socket, buildStatusMessage({ address, online }));
  }

  // Initialise last-known state so the poller only pushes real changes
  const lastState = new Map<string, boolean>(initialStatuses);
  socketLastState.set(socket, lastState);

  // Start polling interval
  const interval = setInterval(() => {
    getBatchPresenceStatus(confirmedFriends)
      .then((current) => {
        for (const [address, online] of current) {
          const previous = lastState.get(address);
          if (previous !== online) {
            lastState.set(address, online);
            safeSend(socket, buildStatusMessage({ address, online }));
          }
        }
      })
      .catch((err) => {
        logger.warn(
          {
            error: err instanceof Error ? err.message : String(err),
          },
          "presence: poll tick failed",
        );
      });
  }, POLL_INTERVAL_MS);

  // Clear any previous interval (re-subscription)
  const existingInterval = socketPollers.get(socket);
  if (existingInterval !== undefined) {
    clearInterval(existingInterval);
  }
  socketPollers.set(socket, interval);

  logger.debug(
    { subscriber: subscriberAddress, watching: confirmedFriends },
    "presence: subscribed",
  );
}

// ---------------------------------------------------------------------------
// Channel handler (dispatches by message type)
// ---------------------------------------------------------------------------

async function presenceChannelHandler(
  socket: Socket,
  address: Address,
  message: WsEnvelope,
): Promise<void> {
  switch (message.type) {
    case "SUBSCRIBE":
      await handleSubscribe(socket, address, message.payload);
      break;

    case "UNSUBSCRIBE":
      stopPolling(socket);
      logger.debug({ address }, "presence: unsubscribed");
      break;

    default:
      safeSend(
        socket,
        buildErrorMessage(
          "UNKNOWN_TYPE",
          `Unknown presence message type: ${message.type}`,
        ),
      );
  }
}

// ---------------------------------------------------------------------------
// Cleanup hook — called externally when a socket closes
// ---------------------------------------------------------------------------

/**
 * Clean up all presence resources for a disconnected socket.
 * Should be called from the WS onClose handler (via wsServer.ts).
 */
export function cleanupPresence(socket: Socket): void {
  stopPolling(socket);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the presence channel handler with the message router.
 * Call this once at application startup (from wsServer.ts or app.ts).
 */
export function registerPresenceChannel(): void {
  messageRouter.register("presence", presenceChannelHandler);
  logger.info("presence channel registered");
}
