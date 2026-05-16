import type { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";

import { env } from "../config/env";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";
import { UnauthorizedError } from "../lib/errors";

/**
 * Augment Hono's ContextVariableMap to include custom variables.
 * This provides type safety for c.set('address', ...) and c.get('address').
 */
declare module "hono" {
  interface ContextVariableMap {
    address: Address;
    requestId: string;
  }
}

/**
 * Extract and verify JWT from the Authorization header.
 *
 * @param token - The raw JWT token (without "Bearer " prefix)
 * @returns Decoded JWT payload with sub, jti, and other claims
 * @throws UnauthorizedError if token is invalid, expired, or revoked
 */
async function verifyAndDecodeToken(token: string): Promise<{
  sub: Address;
  jti?: string;
  iat?: number;
  exp?: number;
}> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Extract required claims
    const sub = payload.sub as string;
    if (!sub) {
      throw new UnauthorizedError('JWT missing required "sub" claim');
    }

    const result: { sub: Address; jti?: string; iat?: number; exp?: number } = {
      sub: sub as Address,
    };

    if (payload.jti) {
      result.jti = payload.jti as string;
    }
    if (payload.iat) {
      result.iat = payload.iat as number;
    }
    if (payload.exp) {
      result.exp = payload.exp as number;
    }

    return result;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }

    // jwtVerify throws on invalid/expired token
    logger.debug(
      { error: err instanceof Error ? err.message : String(err) },
      "JWT verification failed",
    );
    throw new UnauthorizedError("Invalid or expired token");
  }
}

/**
 * Check if a JWT has been revoked in Redis.
 *
 * @param jti - JWT ID (unique token identifier)
 * @returns true if the token is revoked, false otherwise
 */
async function isTokenRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) {
    return false; // No JTI means can't be revoked
  }

  try {
    const revoked = await redis.get(`revoked:jwt:${jti}`);
    return revoked !== null;
  } catch (err) {
    logger.warn(
      { jti, error: err instanceof Error ? err.message : String(err) },
      "Failed to check token revocation status",
    );
    // Fail open: if Redis is unavailable, allow the request
    // (revocation is a nice-to-have for force-logout, not critical)
    return false;
  }
}

/**
 * Hono middleware: Requires valid JWT in Authorization header.
 *
 * Behavior:
 * - Reads Authorization: Bearer <jwt> header
 * - Verifies JWT signature and expiration
 * - Checks if token is blacklisted in Redis
 * - Sets c.set('address', ...) on success
 * - Throws UnauthorizedError (401) on failure
 *
 * Usage:
 * ```ts
 * app.use('/api/*', requireAuth)
 * // or on specific routes:
 * app.get('/api/protected', requireAuth, handler)
 * ```
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const decoded = await verifyAndDecodeToken(token);

  // Check if token has been revoked
  const revoked = await isTokenRevoked(decoded.jti);
  if (revoked) {
    throw new UnauthorizedError("Token has been revoked");
  }

  // Store address in context for downstream handlers
  c.set("address", decoded.sub);

  await next();
};

/**
 * Hono middleware: Attempts to authenticate but doesn't fail if missing/invalid.
 *
 * Behavior:
 * - Reads Authorization: Bearer <jwt> header if present
 * - Verifies JWT if header is present
 * - Sets c.set('address', ...) on success
 * - Silently skips authentication on missing/invalid token
 * - Never throws 401 — always proceeds to next handler
 *
 * Useful for public endpoints that personalize when logged in
 * (e.g., recommendations, search results).
 *
 * Usage:
 * ```ts
 * app.get('/api/public', optionalAuth, handler)
 * // In handler:
 * const address = c.get('address') // undefined if not authenticated
 * ```
 */
export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  // No header → proceed without authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await verifyAndDecodeToken(token);

    // Check if token has been revoked
    const revoked = await isTokenRevoked(decoded.jti);
    if (!revoked) {
      // Token is valid and not revoked → set address
      c.set("address", decoded.sub);
    }
    // If revoked, silently skip (don't set address, but also don't fail)
  } catch {
    // Token invalid/expired → silently continue without authentication
    // This is intentional: optionalAuth should never fail
  }

  await next();
};
