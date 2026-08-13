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
import { optionalAuth } from "../middleware/auth";
import { authNonceLimit, authVerifyLimit } from "../middleware/rateLimit";
import {
  clearPresence,
  issueNonce,
  verifySiweAndIssueJwt,
} from "../services/authService";

const auth = new Hono();

// ---------------------------------------------------------------------------
// GET /auth/nonce
// ---------------------------------------------------------------------------

// Rate limited: 10 req/min per IP — caps brute-force nonce harvesting.
auth.get("/nonce", authNonceLimit, (c) => {
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

// Rate limited: 5 req/min per IP — caps signature-guessing attempts.
auth.post("/verify", authVerifyLimit, async (c) => {
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

// JWT is stateless — revocation is client-side (discard the token). All we do
// here is clear the Redis presence key, and optionalAuth is what says whose.
// It used to read `sub` out of an unverified token, so anyone could post a
// hand-written JWT and knock another player offline.
auth.post("/logout", optionalAuth, async (c) => {
  const address = c.get("address");
  if (address) {
    await clearPresence(address);
  }

  // Idempotent: an absent or bad token is still a successful logout.
  return c.json({ success: true });
});

export { auth as authRouter };
