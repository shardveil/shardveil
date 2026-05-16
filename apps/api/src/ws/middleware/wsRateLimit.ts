import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import type { Address } from "../../config/viem";

/** WS close code for rate limit exceeded. */
export const WS_CLOSE_RATE_LIMITED = 4003;

/** Per-socket sliding window: max messages per second (in-memory). */
const MAX_MSG_PER_SECOND = 10;

/** Per-address sliding window: max messages per minute (Redis). */
const MAX_MSG_PER_MINUTE = 100;

/** Redis key TTL in seconds for per-address minute counter. */
const MINUTE_TTL_SECONDS = 60;

type Socket = WSContext<WebSocket>;

/**
 * In-memory per-socket rate limit state.
 * Tracks the count of messages in the current 1-second window.
 */
interface SocketRateState {
  /** Count of messages received in the current second window. */
  count: number;
  /** Timestamp (ms) when the current window started. */
  windowStart: number;
}

/** In-memory store keyed by socket instance. Cleaned up by wsRateLimit when socket closes. */
const socketState = new Map<Socket, SocketRateState>();

/**
 * Check and enforce rate limits for an inbound WebSocket message.
 *
 * Two limits are enforced:
 * 1. **Per-socket / per-second** (in-memory): max 10 messages per second.
 *    If exceeded, the socket is closed with code 4003.
 * 2. **Per-address / per-minute** (Redis): max 100 messages per minute.
 *    If exceeded, the socket is closed with code 4003.
 *
 * @returns `true` if the message is allowed, `false` if it was rate-limited
 *          (caller should NOT process the message after `false`).
 */
export async function checkRateLimit(
  socket: Socket,
  address: Address,
): Promise<boolean> {
  // -------------------------------------------------------------------------
  // 1. Per-socket per-second (in-memory sliding window)
  // -------------------------------------------------------------------------
  const now = Date.now();
  let state = socketState.get(socket);

  if (!state) {
    state = { count: 0, windowStart: now };
    socketState.set(socket, state);
  }

  const elapsed = now - state.windowStart;
  if (elapsed >= 1000) {
    // New second window — reset
    state.count = 1;
    state.windowStart = now;
  } else {
    state.count += 1;
    if (state.count > MAX_MSG_PER_SECOND) {
      logger.warn(
        { address, count: state.count },
        "WS: per-socket rate limit exceeded (10 msg/s) — closing",
      );
      socket.close(WS_CLOSE_RATE_LIMITED, "Rate limit exceeded");
      socketState.delete(socket);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // 2. Per-address per-minute (Redis INCR + EXPIRE)
  // -------------------------------------------------------------------------
  const redisKey = `ws:rl:${address}:min`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // First message in this window — set TTL
      await redis.expire(redisKey, MINUTE_TTL_SECONDS);
    }
    if (count > MAX_MSG_PER_MINUTE) {
      logger.warn(
        { address, count },
        "WS: per-address rate limit exceeded (100 msg/min) — closing",
      );
      socket.close(WS_CLOSE_RATE_LIMITED, "Rate limit exceeded");
      socketState.delete(socket);
      return false;
    }
  } catch (err) {
    // Redis unavailable — fail open (allow the message)
    logger.warn(
      { address, error: err instanceof Error ? err.message : String(err) },
      "WS: Redis rate-limit check failed — failing open",
    );
  }

  return true;
}

/**
 * Remove in-memory rate-limit state for a socket on disconnect.
 * Should be called from the `onClose` handler.
 */
export function cleanupRateLimit(socket: Socket): void {
  socketState.delete(socket);
}
