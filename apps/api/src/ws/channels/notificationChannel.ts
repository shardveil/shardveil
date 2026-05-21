/**
 * Notification Channel — Task 4.4
 *
 * This channel is primarily server→client push. The server pushes a NEW
 * notification envelope whenever `notificationService.create()` is called
 * and the recipient has an active WebSocket connection.
 *
 * Protocol
 * --------
 * Inbound (optional — client acknowledgement):
 *   { channel: 'notification', type: 'SUBSCRIBE', payload: {} }
 *   → Server replies with { channel: 'notification', type: 'SUBSCRIBED', payload: {} }
 *
 * Outbound (server-initiated):
 *   { channel: 'notification', type: 'NEW', payload: { notification } }
 *
 * Implementation details
 * ----------------------
 * - Notifications are pushed directly by notificationService.create() via
 *   connectionManager.sendToAddress(); this handler only handles inbound
 *   client messages (currently just SUBSCRIBE for acknowledgement).
 * - Unknown message types receive an error response (no disconnect).
 */

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { logger } from "../../config/logger";
import type { Address } from "../../config/viem";
import type { WsEnvelope } from "../messageRouter";
import { messageRouter } from "../messageRouter";

type Socket = WSContext<WebSocket>;

// ---------------------------------------------------------------------------
// Outbound message helpers
// ---------------------------------------------------------------------------

function buildSubscribedMessage(): string {
  return JSON.stringify({
    channel: "notification",
    type: "SUBSCRIBED",
    payload: {},
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
// SUBSCRIBE handler
// ---------------------------------------------------------------------------

function handleSubscribe(socket: Socket, address: Address): void {
  // Notifications are auto-pushed; SUBSCRIBE is an optional client handshake.
  // Acknowledge so the client knows the channel is active.
  safeSend(socket, buildSubscribedMessage());
  logger.debug({ address }, "notification channel: client subscribed");
}

// ---------------------------------------------------------------------------
// Channel handler (dispatches by message type)
// ---------------------------------------------------------------------------

function notificationChannelHandler(
  socket: Socket,
  address: Address,
  message: WsEnvelope,
): void {
  switch (message.type) {
    case "SUBSCRIBE":
      handleSubscribe(socket, address);
      break;

    default:
      safeSend(
        socket,
        buildErrorMessage(
          "UNKNOWN_TYPE",
          `Unknown notification message type: ${message.type}`,
        ),
      );
      logger.debug(
        { address, type: message.type },
        "notification channel: unknown message type",
      );
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the notification channel handler with the message router.
 * Call this once at application startup (from wsServer.ts).
 */
export function registerNotificationChannel(): void {
  messageRouter.register("notification", notificationChannelHandler);
  logger.info("notification channel registered");
}
