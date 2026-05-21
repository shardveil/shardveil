import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import { z } from "zod";

import { logger } from "../config/logger";
import type { Address } from "../config/viem";
import { checkRateLimit } from "./middleware/wsRateLimit";

/** WS close code for malformed JSON. */
export const WS_CLOSE_MALFORMED = 4002;

type Socket = WSContext<WebSocket>;

// ---------------------------------------------------------------------------
// Zod schema for the inbound message envelope
// ---------------------------------------------------------------------------

/**
 * Every inbound WebSocket message must match this envelope schema.
 * Individual channel handlers are responsible for validating their own payload.
 */
const WsEnvelopeSchema = z.object({
  channel: z.enum(["battle", "chat", "notification", "presence"]),
  type: z.string().min(1),
  payload: z.unknown(),
});

export type WsEnvelope = z.infer<typeof WsEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Channel handler type
// ---------------------------------------------------------------------------

/**
 * A channel handler receives a validated message envelope and the authenticated
 * sender's address. It may throw — errors are caught and converted to error
 * responses by the router.
 */
export type ChannelHandler = (
  socket: Socket,
  address: Address,
  message: WsEnvelope,
) => Promise<void> | void;

// ---------------------------------------------------------------------------
// Error response helpers
// ---------------------------------------------------------------------------

/**
 * Build a JSON error response that matches the REST API error shape:
 * `{ error: { code, message } }`
 */
function buildErrorPayload(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } });
}

function sendError(socket: Socket, code: string, message: string): void {
  try {
    socket.send(buildErrorPayload(code, message));
  } catch {
    // Socket may already be closed — ignore
  }
}

// ---------------------------------------------------------------------------
// MessageRouter class
// ---------------------------------------------------------------------------

/**
 * Central WebSocket message router.
 *
 * Channel modules (Tasks 4.3–4.6) call `router.register(channel, handler)`
 * at startup to install themselves. The router is responsible for:
 *
 * 1. Parsing raw data as JSON (malformed → close 4002).
 * 2. Applying rate limits (exceeded → close 4003).
 * 3. Validating the envelope with Zod (invalid → error response, no close).
 * 4. Routing to the registered channel handler (unknown channel → error response).
 * 5. Catching handler errors and converting them to error responses.
 */
class MessageRouter {
  private readonly handlers = new Map<string, ChannelHandler>();

  /**
   * Register a handler for a given channel name.
   * Call this once per channel at application startup.
   */
  register(channel: WsEnvelope["channel"], handler: ChannelHandler): void {
    this.handlers.set(channel, handler);
    logger.debug({ channel }, "WS: channel handler registered");
  }

  /**
   * Route a raw inbound WebSocket message.
   *
   * @param socket  - The source socket (used for replies and close).
   * @param address - The authenticated Ethereum address of the sender.
   * @param rawData - The raw event data (string only; binary frames ignored upstream).
   */
  async route(
    socket: Socket,
    address: Address,
    rawData: unknown,
  ): Promise<void> {
    // -----------------------------------------------------------------------
    // 1. Binary frames are ignored — only strings are processed.
    // -----------------------------------------------------------------------
    if (typeof rawData !== "string") {
      return;
    }

    // -----------------------------------------------------------------------
    // 2. Parse JSON — close with 4002 on failure.
    // -----------------------------------------------------------------------
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      logger.warn({ address }, "WS: malformed JSON — closing connection");
      socket.close(WS_CLOSE_MALFORMED, "Malformed JSON");
      return;
    }

    // -----------------------------------------------------------------------
    // 3. Rate limiting — close with 4003 if exceeded.
    //    checkRateLimit() closes the socket itself and returns false.
    // -----------------------------------------------------------------------
    const allowed = await checkRateLimit(socket, address);
    if (!allowed) {
      // Socket already closed by checkRateLimit
      return;
    }

    // -----------------------------------------------------------------------
    // 4. Validate envelope with Zod.
    // -----------------------------------------------------------------------
    const envelopeResult = WsEnvelopeSchema.safeParse(parsed);
    if (!envelopeResult.success) {
      const detail = envelopeResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      logger.debug({ address, detail }, "WS: invalid message envelope");
      sendError(socket, "INVALID_MESSAGE", `Invalid message format: ${detail}`);
      return;
    }

    const envelope = envelopeResult.data;

    // -----------------------------------------------------------------------
    // 5. Route to channel handler.
    // -----------------------------------------------------------------------
    const handler = this.handlers.get(envelope.channel);
    if (!handler) {
      logger.debug(
        { address, channel: envelope.channel },
        "WS: no handler registered for channel",
      );
      sendError(
        socket,
        "UNKNOWN_CHANNEL",
        `No handler registered for channel: ${envelope.channel}`,
      );
      return;
    }

    // -----------------------------------------------------------------------
    // 6. Execute handler — catch errors and convert to error responses.
    // -----------------------------------------------------------------------
    try {
      await handler(socket, address, envelope);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      logger.error(
        {
          address,
          channel: envelope.channel,
          type: envelope.type,
          error: message,
        },
        "WS: channel handler threw an error",
      );
      sendError(socket, "HANDLER_ERROR", message);
    }
  }
}

/**
 * Application-wide singleton message router.
 * Import and use `messageRouter.register(channel, handler)` in each channel module.
 * The WS server calls `messageRouter.route(socket, address, rawData)` in onMessage.
 */
export const messageRouter = new MessageRouter();
