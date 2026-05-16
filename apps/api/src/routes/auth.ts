/**
 * Auth routes — SIWE (Sign In with Ethereum) flow
 *
 * GET  /auth/nonce   → { nonce, expiresAt }
 * POST /auth/verify  → { token, expiresAt, player }
 * POST /auth/logout  → { success: true }
 */

import { Hono } from "hono";
import { z } from "zod";

import { ValidationError } from "../lib/errors";
import {
  clearPresence,
  issueNonce,
  verifySiweAndIssueJwt,
} from "../services/authService";

const auth = new Hono();

// ---------------------------------------------------------------------------
// GET /auth/nonce
// ---------------------------------------------------------------------------

// TODO(Task 3.9): Apply rate limiting here — 10 requests/min per IP
auth.get("/nonce", (c) => {
  const { nonce, expiresAt } = issueNonce();
  return c.json({ nonce, expiresAt });
});

// ---------------------------------------------------------------------------
// POST /auth/verify
// ---------------------------------------------------------------------------

const verifyBodySchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

// TODO(Task 3.9): Apply rate limiting here — 10 requests/min per IP
auth.post("/verify", async (c) => {
  const body = await c.req.json().catch(() => null);

  const parsed = verifyBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { message, signature } = parsed.data;
  const result = await verifySiweAndIssueJwt(message, signature);

  return c.json(result);
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

auth.post("/logout", async (c) => {
  // JWT is stateless — revocation is client-side (discard the token).
  // We only clear the Redis presence key here.
  //
  // To identify the address: attempt to read it from the Authorization header.
  // If not present, the request is still treated as a successful logout (idempotent).
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Decode payload without verifying (verification is the auth middleware's job).
    // We just need the `sub` (address) to clear presence.
    const token = authHeader.slice(7);
    try {
      const [, payloadB64] = token.split(".");
      if (payloadB64) {
        const payload = JSON.parse(
          Buffer.from(payloadB64, "base64url").toString("utf8"),
        ) as { sub?: string };
        if (payload.sub) {
          await clearPresence(payload.sub);
        }
      }
    } catch {
      // Non-fatal — we still return 200 (logout is idempotent)
    }
  }

  return c.json({ success: true });
});

export { auth as authRouter };
