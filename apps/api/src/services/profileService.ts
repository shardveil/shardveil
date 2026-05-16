/**
 * Profile service — reads and writes Player profiles.
 *
 * Manages player profile data stored in Prisma with caching via Redis.
 * Cache keys:
 *   - profile:{address} → ProfileData, TTL 5min (300s)
 */

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { ApiError, NotFoundError, ValidationError } from "../lib/errors";
import { cacheService } from "./cacheService";

// ============================================================================
// Types
// ============================================================================

export interface ProfileData {
  address: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  discordHandle: string | null;
  isPrivate: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface ProfileUpdateInput {
  bio?: string | undefined;
  twitterHandle?: string | undefined;
  discordHandle?: string | undefined;
  isPrivate?: boolean | undefined;
}

// ============================================================================
// Constants
// ============================================================================

// IPFS CID validation: supports CIDv0 (Qm...) and CIDv1 (bafy...)
const IPFS_CID_REGEX = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^bafy[a-z2-7]{55}$/;

// Cache TTL for profile data
const PROFILE_CACHE_TTL = 300; // 5 minutes in seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform a Prisma Player record to ProfileData response format.
 */
function playerToProfileData(player: {
  address: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  discordHandle: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProfileData {
  return {
    address: player.address,
    username: player.username,
    bio: player.bio,
    avatarUrl: player.avatarUrl,
    twitterHandle: player.twitterHandle,
    discordHandle: player.discordHandle,
    isPrivate: player.isPrivate,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
  };
}

/**
 * Get cache key for a profile.
 */
function getProfileCacheKey(address: string): string {
  return `profile:${address}`;
}

// ============================================================================
// Service Methods
// ============================================================================

/**
 * Retrieve a player profile by address.
 *
 * Reads from cache first (5min TTL). On cache miss, reads from Prisma.
 * Returns null if the player does not exist in the database.
 *
 * @param address - Ethereum address (0x...)
 * @returns ProfileData or null if player not found
 */
export async function getProfile(address: string): Promise<ProfileData | null> {
  const cacheKey = getProfileCacheKey(address);

  // Try cache first
  const cached = await cacheService.get<ProfileData>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss — read from database
  try {
    const player = await prisma.player.findUnique({
      where: { address },
    });

    if (!player) {
      return null;
    }

    const profile = playerToProfileData(player);

    // Cache the result
    await cacheService.set(cacheKey, profile, PROFILE_CACHE_TTL);

    return profile;
  } catch (error) {
    // Re-throw ApiError subclasses (e.g. ValidationError, NotFoundError) as-is
    if (error instanceof ApiError) throw error;
    logger.error({ error, address }, "profileService error");
    throw new ApiError(500, "INTERNAL", "Something went wrong");
  }
}

/**
 * Update or create a player profile.
 *
 * Updates a Player record in Prisma and invalidates the cache.
 * Throws NotFoundError if player does not exist.
 *
 * @param address - Ethereum address (0x...)
 * @param updates - Fields to update (bio, twitterHandle, discordHandle, isPrivate)
 * @returns Updated ProfileData
 * @throws NotFoundError if player does not exist
 */
export async function updateProfile(
  address: string,
  updates: ProfileUpdateInput,
): Promise<ProfileData> {
  try {
    // Check that player exists
    const existing = await prisma.player.findUnique({ where: { address } });
    if (!existing) throw new NotFoundError("Player not found");

    // Update the player record
    const player = await prisma.player.update({
      where: { address },
      data: {
        ...(updates.bio !== undefined && { bio: updates.bio }),
        ...(updates.twitterHandle !== undefined && {
          twitterHandle: updates.twitterHandle,
        }),
        ...(updates.discordHandle !== undefined && {
          discordHandle: updates.discordHandle,
        }),
        ...(updates.isPrivate !== undefined && {
          isPrivate: updates.isPrivate,
        }),
      },
    });

    const profile = playerToProfileData(player);

    // Invalidate cache
    const cacheKey = getProfileCacheKey(address);
    await cacheService.del(cacheKey);

    logger.info({ address }, "Profile updated");

    return profile;
  } catch (error) {
    // Re-throw ApiError subclasses (e.g. ValidationError, NotFoundError) as-is
    if (error instanceof ApiError) throw error;
    logger.error({ error, address }, "profileService error");
    throw new ApiError(500, "INTERNAL", "Something went wrong");
  }
}

/**
 * Update a player's avatar URL (from IPFS CID).
 *
 * Validates the IPFS CID format and updates the avatarUrl field in Prisma.
 * Invalidates cache.
 * Throws NotFoundError if player does not exist.
 *
 * @param address - Ethereum address (0x...)
 * @param ipfsCid - IPFS content ID (CIDv0 or CIDv1)
 * @returns Updated ProfileData
 * @throws ValidationError if CID format is invalid
 * @throws NotFoundError if player does not exist
 */
export async function updateAvatar(
  address: string,
  ipfsCid: string,
): Promise<ProfileData> {
  try {
    // Validate CID format
    if (!IPFS_CID_REGEX.test(ipfsCid)) {
      throw new ValidationError("Invalid IPFS CID format");
    }

    // Check that player exists
    const existing = await prisma.player.findUnique({ where: { address } });
    if (!existing) throw new NotFoundError("Player not found");

    // Construct IPFS URL (assuming gateway)
    const avatarUrl = `ipfs://${ipfsCid}`;

    // Update the player record
    const player = await prisma.player.update({
      where: { address },
      data: { avatarUrl },
    });

    const profile = playerToProfileData(player);

    // Invalidate cache
    const cacheKey = getProfileCacheKey(address);
    await cacheService.del(cacheKey);

    logger.info({ address, ipfsCid }, "Avatar updated");

    return profile;
  } catch (error) {
    // Re-throw ApiError subclasses (e.g. ValidationError, NotFoundError) as-is
    if (error instanceof ApiError) throw error;
    logger.error({ error, address, ipfsCid }, "profileService error");
    throw new ApiError(500, "INTERNAL", "Something went wrong");
  }
}

/**
 * Check if a username is available (not taken by another player).
 *
 * Caches result for 60 seconds to prevent DB enumeration attacks.
 * Currently checks the database only for uniqueness.
 * TODO: call ProfileRegistry.isUsernameAvailable when Module 02 deploys
 *
 * @param username - Username to check
 * @returns true if available, false if taken
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  try {
    const cacheKey = `username-check:${username.toLowerCase()}`;
    const cached = await cacheService.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    const existing = await prisma.player.findUnique({
      where: { username },
    });

    const available = existing === null;
    await cacheService.set(cacheKey, available, 60);
    return available;
  } catch (error) {
    // Re-throw ApiError subclasses (e.g. ValidationError, NotFoundError) as-is
    if (error instanceof ApiError) throw error;
    logger.error({ error, username }, "profileService error");
    throw new ApiError(500, "INTERNAL", "Something went wrong");
  }
}
