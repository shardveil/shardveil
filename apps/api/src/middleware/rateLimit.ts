import { randomUUID } from "node:crypto";

import type { Context, MiddlewareHandler } from "hono";

import { redis } from "../config/redis";
import { RateLimitError } from "../lib/errors";

/**
 * Configuration for rate limiting middleware.
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests allowed in the window
 * @param keyBy - How to identify the client: 'ip' or 'address' (wallet address)
 * @param name - Name for this rate limit (used in Redis key prefix)
 */
interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyBy: "ip" | "address";
  name: string;
}

/**
 * Check rate limit using Redis sliding window algorithm with sorted sets.
 *
 * Algorithm:
 * 1. Remove expired entries (older than window start)
 * 2. Add current request with current timestamp
 * 3. Count requests in window (including just-added entry)
 * 4. Set TTL so key auto-expires after window
 * 5. If count > max, remove the just-added entry and deny
 * 6. Otherwise allow and return retry-after time
 *
 * @param key - Redis key for this rate limit bucket
 * @param windowMs - Window size in milliseconds
 * @param max - Maximum requests per window
 * @returns Object with allowed flag and retryAfterMs if denied
 */
async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  // Use pipeline for atomic operations
  const pipeline = redis.pipeline();

  // 1. Remove expired entries (older than window start)
  pipeline.zremrangebyscore(redisKey, "-inf", windowStart.toString());

  // 2. Add current request with unique member to ensure uniqueness
  // Member format: timestamp-uuid to avoid collisions
  const member = `${now}-${randomUUID()}`;
  pipeline.zadd(redisKey, now, member);

  // 3. Count requests in window (including the one we just added)
  pipeline.zcard(redisKey);

  // 4. Set TTL to auto-expire after window
  pipeline.pexpire(redisKey, windowMs);

  const results = await pipeline.exec();

  if (!results) {
    // Pipeline failed, return allowed (fail open)
    return { allowed: true, retryAfterMs: 0 };
  }

  // results[2] is the zcard response: [null, count]
  const count = (results[2]?.[1] as number) ?? 0;

  if (count > max) {
    // Over limit - remove the entry we just added
    await redis.zremrangebyscore(redisKey, now.toString(), now.toString());

    // Get the oldest entry to calculate retry-after time
    const oldest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
    const oldestMs = oldest.length >= 2 ? Number(oldest[1]) : now;

    // Calculate how long until the oldest entry expires
    const retryAfterMs =
      Math.max(0, Math.ceil((oldestMs + windowMs - now) / 1000)) * 1000;

    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for (takes first IP in chain), then x-real-ip, then defaults to 'unknown'.
 */
function getIp(c: Context): string {
  const xForwardedFor = c.req.header("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const xRealIp = c.req.header("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  return "unknown";
}

/**
 * Hono middleware factory for rate limiting.
 *
 * Creates a middleware that enforces sliding-window rate limits using Redis.
 * Supports limiting by IP or authenticated wallet address.
 *
 * Usage:
 * ```ts
 * app.post('/auth/nonce', rateLimit({ windowMs: 60_000, max: 10, keyBy: 'ip', name: 'auth:nonce' }), handler)
 * ```
 *
 * On rate limit exceeded:
 * - Returns 429 status code
 * - Sets Retry-After header with seconds until limit resets
 * - Throws RateLimitError with descriptive message
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  return async (c, next) => {
    // Determine identifier based on keyBy option
    let identifier: string;

    if (options.keyBy === "address") {
      // Try to get authenticated address, fall back to IP
      identifier = c.get("address") ?? getIp(c);
    } else {
      // Use IP for 'ip' key type
      identifier = getIp(c);
    }

    const key = `${options.name}:${identifier}`;
    const { allowed, retryAfterMs } = await checkRateLimit(
      key,
      options.windowMs,
      options.max,
    );

    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      c.header("Retry-After", retryAfterSec.toString());
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfterSec} seconds.`,
      );
    }

    await next();
  };
}

/**
 * Pre-configured rate limit: Auth nonce generation
 * - 10 requests per 60 seconds per IP
 * - Limits brute-force nonce generation attempts
 */
export const authNonceLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyBy: "ip",
  name: "auth:nonce",
});

/**
 * Pre-configured rate limit: Auth verification
 * - 5 requests per 60 seconds per IP
 * - Limits brute-force signature verification attempts
 */
export const authVerifyLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyBy: "ip",
  name: "auth:verify",
});

/**
 * Pre-configured rate limit: Chat messages
 * - 1 message per 3 seconds per wallet address
 * - Tight limit to prevent spam
 */
export const chatLimit = rateLimit({
  windowMs: 3_000,
  max: 1,
  keyBy: "address",
  name: "chat",
});

/**
 * Pre-configured rate limit: Standard API requests
 * - 60 requests per 60 seconds per wallet address
 * - Default for most authenticated endpoints
 */
export const standardLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  keyBy: "address",
  name: "api",
});

/**
 * Pre-configured rate limit: Heavy read operations
 * - 30 requests per 60 seconds per IP
 * - For expensive operations like leaderboard queries
 */
export const heavyReadLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyBy: "ip",
  name: "heavy",
});
