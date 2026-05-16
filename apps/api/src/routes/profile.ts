/**
 * Profile routes — read and update player profiles
 *
 * GET  /me                      requireAuth → { profile data }
 * GET  /:address                optionalAuth, public → { profile data or 404 }
 * PATCH /me                     requireAuth → { updated profile }
 * POST  /me/avatar              requireAuth → { updated profile }
 * GET  /check-username/:name    public → { available: boolean }
 */

import { Hono } from "hono";
import { z } from "zod";

import { ValidationError, NotFoundError } from "../lib/errors";
import { requireAuth, optionalAuth } from "../middleware/auth";
import {
  getProfile,
  updateProfile,
  updateAvatar,
  checkUsernameAvailable,
  type ProfileData,
  type ProfileUpdateInput,
} from "../services/profileService";

const profileRouter = new Hono();

// ============================================================================
// Zod Schemas
// ============================================================================

const updateProfileBodySchema = z.object({
  bio: z.string().max(160).optional(),
  twitterHandle: z.string().optional(),
  discordHandle: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

const updateAvatarBodySchema = z.object({
  ipfsCid: z.string().min(1),
});

// ============================================================================
// Helper: Apply Privacy Rules
// ============================================================================

/**
 * Apply privacy rules to a profile based on the requester's address.
 *
 * If the profile is private AND the requester is not the owner,
 * hide sensitive fields: bio, twitterHandle, discordHandle.
 *
 * @param profile - The profile to filter
 * @param requesterAddress - Address of the authenticated user (or undefined if public)
 * @returns Filtered profile with privacy rules applied
 */
function applyPrivacyRules(
  profile: ProfileData,
  requesterAddress: string | undefined,
): ProfileData {
  // If profile is not private, return as-is
  if (!profile.isPrivate) {
    return profile;
  }

  // If requester is the owner, show full profile
  if (requesterAddress === profile.address) {
    return profile;
  }

  // Profile is private and requester is not the owner — hide sensitive fields
  // (Friends check comes in Module 04/social features)
  return {
    ...profile,
    bio: null,
    twitterHandle: null,
    discordHandle: null,
  };
}

// ============================================================================
// GET /me
// ============================================================================

/**
 * Get authenticated user's own profile.
 * Requires JWT authentication.
 */
profileRouter.get("/me", requireAuth, async (c) => {
  const address = c.get("address");

  const profile = await getProfile(address);

  if (!profile) {
    throw new NotFoundError("Player profile not found");
  }

  return c.json(profile);
});

// ============================================================================
// GET /:address
// ============================================================================

/**
 * Get a player's profile by address (public with optional authentication).
 * Validates address format.
 * Applies privacy rules if profile is private.
 */
profileRouter.get("/:address", optionalAuth, async (c) => {
  const address = c.req.param("address");

  // Validate Ethereum address format
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new ValidationError("Invalid Ethereum address format");
  }

  const profile = await getProfile(address);

  if (!profile) {
    throw new NotFoundError("Player profile not found");
  }

  // Apply privacy rules: requester is c.get('address') or undefined if not authenticated
  const requesterAddress = c.get("address");
  const filtered = applyPrivacyRules(profile, requesterAddress);

  return c.json(filtered);
});

// ============================================================================
// PATCH /me
// ============================================================================

/**
 * Update authenticated user's profile.
 * Requires JWT authentication.
 * Validates request body using Zod schema.
 */
profileRouter.patch("/me", requireAuth, async (c) => {
  const address = c.get("address");

  const body = await c.req.json().catch(() => null);

  const parsed = updateProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors,
    );
  }

  const updates: ProfileUpdateInput = parsed.data;

  // Only include fields that were provided (not undefined)
  const sanitized: ProfileUpdateInput = {};
  if (updates.bio !== undefined) sanitized.bio = updates.bio;
  if (updates.twitterHandle !== undefined)
    sanitized.twitterHandle = updates.twitterHandle;
  if (updates.discordHandle !== undefined)
    sanitized.discordHandle = updates.discordHandle;
  if (updates.isPrivate !== undefined) sanitized.isPrivate = updates.isPrivate;

  const profile = await updateProfile(address, sanitized);

  return c.json(profile);
});

// ============================================================================
// POST /me/avatar
// ============================================================================

/**
 * Update authenticated user's avatar from IPFS CID.
 * Requires JWT authentication.
 * Validates IPFS CID format.
 */
profileRouter.post("/me/avatar", requireAuth, async (c) => {
  const address = c.get("address");

  const body = await c.req.json().catch(() => null);

  const parsed = updateAvatarBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid request body",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { ipfsCid } = parsed.data;

  const profile = await updateAvatar(address, ipfsCid);

  return c.json(profile);
});

// ============================================================================
// GET /check-username/:name
// ============================================================================

/**
 * Check if a username is available (public endpoint).
 * Validates username format: 3-20 alphanumeric characters.
 */
profileRouter.get("/check-username/:name", async (c) => {
  const username = c.req.param("name");

  // Validate username format: 3-20 alphanumeric chars
  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    throw new ValidationError(
      "Username must be 3-20 alphanumeric characters",
    );
  }

  const available = await checkUsernameAvailable(username);

  return c.json({ available });
});

export { profileRouter };
