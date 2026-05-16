import { jwtVerify } from "jose";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import type { Address } from "../../config/viem";

/** WS close code for authentication failure. */
export const WS_CLOSE_UNAUTHORIZED = 4001;

/**
 * Verify the JWT supplied as the `?token=` query parameter.
 *
 * Used in the wsServer's `onOpen` handler — before the connection is fully
 * established — so that invalid connections are rejected immediately.
 *
 * @param token - Raw JWT string (from URL query param)
 * @returns The verified Ethereum address (`sub` claim)
 * @throws if token is missing, invalid, expired, or revoked
 */
export async function verifyWsToken(
  token: string | undefined,
): Promise<Address> {
  if (!token) {
    throw new Error("Missing token query parameter");
  }

  let sub: string;
  let jti: string | undefined;

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    sub = payload.sub as string;
    if (!sub) {
      throw new Error('JWT missing required "sub" claim');
    }

    jti = payload.jti as string | undefined;
  } catch (err) {
    logger.debug(
      { error: err instanceof Error ? err.message : String(err) },
      "WS: JWT verification failed",
    );
    throw new Error("Invalid or expired token");
  }

  // Check revocation list (best-effort; fail open if Redis is unavailable)
  if (jti) {
    try {
      const revoked = await redis.get(`revoked:jwt:${jti}`);
      if (revoked !== null) {
        throw new Error("Token has been revoked");
      }
    } catch (err) {
      // Re-throw only if it's our own revocation error
      if (err instanceof Error && err.message === "Token has been revoked") {
        throw err;
      }
      logger.warn(
        { jti, error: err instanceof Error ? err.message : String(err) },
        "WS: Failed to check token revocation — failing open",
      );
    }
  }

  return sub as Address;
}
