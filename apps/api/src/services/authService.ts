import { SignJWT } from "jose";
import { arbitrumSepolia } from "viem/chains";

import { prisma } from "../config/database";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import { UnauthorizedError } from "../lib/errors";
import { consumeNonce, generateNonce, verifySignature } from "../lib/siwe";

const PRESENCE_TTL = 300; // 5 minutes in seconds

/**
 * Issue a new nonce for SIWE authentication.
 *
 * @returns The nonce string and its expiry time (5 minutes from now)
 */
export function issueNonce(): { nonce: string; expiresAt: string } {
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  return { nonce, expiresAt };
}

/**
 * Verify a SIWE message+signature, consume the nonce, upsert the Player row,
 * set a Redis presence key, and return a signed JWT.
 *
 * Throws UnauthorizedError on:
 * - Invalid signature
 * - Nonce not found (expired or already consumed → replay blocked)
 *
 * @param message   - The EIP-4361 SIWE message (built on the client via buildMessage)
 * @param signature - 0x-prefixed EIP-191 signature
 * @returns JWT token, its expiry time, and the Player record
 */
export async function verifySiweAndIssueJwt(
  message: string,
  signature: string,
): Promise<{
  token: string;
  expiresAt: string;
  player: { address: string; username: string | null };
}> {
  // 1. Verify signature
  const { valid, address } = await verifySignature(
    message,
    signature as `0x${string}`,
  );

  if (!valid || !address) {
    throw new UnauthorizedError("Invalid signature");
  }

  // 2. Extract nonce from message (line: "Nonce: <nonce>")
  const nonce = extractField(message, "Nonce");
  if (!nonce) {
    throw new UnauthorizedError("Nonce not found in message");
  }

  // 3. Consume the nonce atomically (blocks replays and expired nonces)
  const consumed = await consumeNonce(nonce);
  if (!consumed) {
    throw new UnauthorizedError("Nonce expired or already used");
  }

  // 4. Validate chain ID matches expected chain
  const chainIdStr = extractField(message, "Chain ID");
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : null;
  if (chainId !== arbitrumSepolia.id) {
    logger.warn(
      { chainId, expected: arbitrumSepolia.id },
      "Chain ID mismatch in SIWE message",
    );
    throw new UnauthorizedError("Invalid chain ID");
  }

  // 5. Upsert Player — create on first login, no-op on subsequent logins
  const player = await prisma.player.upsert({
    where: { address },
    create: { address },
    update: {}, // no-op on subsequent logins
    select: { address: true, username: true },
  });

  // 6. Set Redis presence key (5-minute TTL)
  await redis.setex(`presence:${address}`, PRESENCE_TTL, "1").catch((err) => {
    logger.error({ err }, "Failed to set presence key in Redis");
  });

  // 7. Sign JWT (HS256, expiry from env)
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const token = await new SignJWT({ sub: address, jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setIssuedAt()
    .sign(secret);

  // Compute expiry from JWT_EXPIRES_IN string (e.g. "7d", "24h", "3600s")
  const expiresAt = computeExpiresAt(env.JWT_EXPIRES_IN);

  return { token, expiresAt, player };
}

/**
 * Clear the Redis presence key for the given address (logout).
 *
 * JWT revocation is client-side (stateless). This only clears the presence indicator.
 *
 * @param address - Ethereum address whose presence should be cleared
 */
export async function clearPresence(address: string): Promise<void> {
  await redis.del(`presence:${address}`).catch((err) => {
    logger.error({ err }, "Failed to clear presence key in Redis");
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract a value from a SIWE message line formatted as "Key: Value".
 */
function extractField(message: string, field: string): string | null {
  const prefix = `${field}: `;
  const line = message.split("\n").find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

/**
 * Compute an ISO expiry timestamp from a duration string like "7d", "24h", "3600s".
 */
function computeExpiresAt(duration: string): string {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match)
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [, valueStr, unit] = match;
  const value = parseInt(valueStr!, 10);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const ms = value * (multipliers[unit!] ?? 86_400_000);
  return new Date(Date.now() + ms).toISOString();
}
