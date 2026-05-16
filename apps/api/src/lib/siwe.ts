import { randomBytes } from "node:crypto";

import { verifyMessage } from "viem";

import { env } from "../config/env";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";

const NONCE_TTL = 5 * 60; // 5 minutes in seconds
const NONCE_PREFIX = "nonce:";

/**
 * Generate a cryptographically random nonce and store it in Redis with 5-minute TTL.
 *
 * The nonce is stored as fire-and-forget (tiny race window is acceptable).
 * Callers should use this nonce immediately in buildMessage().
 *
 * @returns A 64-character hex string (32 random bytes)
 */
export function generateNonce(): string {
  const nonce = randomBytes(32).toString("hex");

  // Store in Redis with TTL (fire-and-forget)
  redis.setex(`${NONCE_PREFIX}${nonce}`, NONCE_TTL, "1").catch((error) => {
    logger.error({ error }, "Failed to store nonce in Redis");
  });

  return nonce;
}

/**
 * Build an EIP-4361 compliant SIWE (Sign In with Ethereum) message.
 *
 * Format:
 * ${domain} wants you to sign in with your Ethereum account:
 * ${address}
 *
 * URI: ${uri}
 * Version: 1
 * Chain ID: ${chainId}
 * Nonce: ${nonce}
 * Issued At: ${issuedAt}
 *
 * @param address - Ethereum address (checksummed)
 * @param nonce - Random nonce (from generateNonce())
 * @param domain - Domain/hostname (e.g., "localhost:3000")
 * @param uri - Full URI (e.g., "http://localhost:3000")
 * @param chainId - EVM chain ID (e.g., 42161 for Arbitrum)
 * @returns EIP-4361 formatted message
 */
export function buildMessage(
  address: Address,
  nonce: string,
  domain: string,
  uri: string,
  chainId: number,
): string {
  const issuedAt = new Date().toISOString();

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/**
 * Verify an EIP-191 signed message using viem's verifyMessage.
 *
 * Extracts the address from the message (line 2) and verifies the signature.
 * Returns null address if verification fails.
 *
 * @param message - The original SIWE message (built with buildMessage())
 * @param signature - The 0x-prefixed signature (65 bytes, 130 hex chars)
 * @returns { valid: boolean; address: Address | null }
 */
export async function verifySignature(
  message: string,
  signature: `0x${string}`,
): Promise<{ valid: boolean; address: Address | null }> {
  try {
    // Extract address from line 2 of the message
    const lines = message.split("\n");
    const address = lines[1] as Address;

    // Verify using viem's verifyMessage (EIP-191)
    const valid = await verifyMessage({
      address,
      message,
      signature,
    });

    return {
      valid,
      address: valid ? address : null,
    };
  } catch (error) {
    logger.error({ error }, "Error verifying signature");
    return {
      valid: false,
      address: null,
    };
  }
}

/**
 * Consume (check-and-delete) a nonce from Redis.
 *
 * Atomically deletes the nonce key and returns whether it existed.
 * This ensures nonces can only be used once.
 *
 * Expired nonces (past 5-minute TTL) will return false (key doesn't exist).
 *
 * @param nonce - The nonce to consume
 * @returns true if nonce existed and was deleted, false otherwise
 */
export async function consumeNonce(nonce: string): Promise<boolean> {
  try {
    // Redis DEL returns number of keys deleted (0 = not found, 1 = found and deleted)
    const deleted = await redis.del(`${NONCE_PREFIX}${nonce}`);
    return deleted === 1;
  } catch (error) {
    logger.error({ error }, "Error consuming nonce");
    return false;
  }
}

/**
 * Extract the domain (hostname) from FRONTEND_URL.
 *
 * Example: "http://localhost:3000" → "localhost:3000"
 *
 * @returns Domain string suitable for SIWE message
 */
export function getDomain(): string {
  return new URL(env.FRONTEND_URL).host;
}
