/**
 * Activity Service — Task 4.12
 *
 * Provides:
 *   - recordActivity: write Activity to DB + push WS to friends
 *   - getFeed: paginated friend activity feed
 *   - like / unlike: Redis-backed per-activity like sets
 */

import type { Activity, ActivityType } from "@prisma/client";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";
import { connectionManager } from "../ws/connectionManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate that `type` is a known ActivityType. */
const VALID_ACTIVITY_TYPES = new Set<string>([
  "PACK_OPENED",
  "BATTLE_WON",
  "BATTLE_LOST",
  "CARD_CRAFTED",
  "CARD_TRADED",
  "GUILD_JOINED",
]);

function isValidActivityType(type: string): type is ActivityType {
  return VALID_ACTIVITY_TYPES.has(type);
}

/**
 * Collect all addresses that are friends of `address` in either direction.
 * Returns an array of address strings.
 */
async function getFriendAddresses(address: string): Promise<string[]> {
  const rows = await prisma.friend.findMany({
    where: {
      OR: [{ playerId: address }, { friendId: address }],
    },
    select: { playerId: true, friendId: true },
  });

  const friends = new Set<string>();
  for (const row of rows) {
    if (row.playerId !== address) friends.add(row.playerId);
    if (row.friendId !== address) friends.add(row.friendId);
  }
  return Array.from(friends);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const activityService = {
  /**
   * Record an activity for `actorAddress` and push it over WS to their friends.
   *
   * No-ops silently if:
   *  - `type` is not a valid ActivityType
   *  - the actor's Player record has isPrivate = true
   */
  async recordActivity(
    actorAddress: string,
    type: string,
    payload: object,
  ): Promise<void> {
    // 1. Validate type
    if (!isValidActivityType(type)) {
      logger.warn(
        { actorAddress, type },
        "activityService.recordActivity: unknown ActivityType — skipping",
      );
      return;
    }

    // 2. Privacy check
    const player = await prisma.player.findUnique({
      where: { address: actorAddress },
      select: { isPrivate: true },
    });

    if (player?.isPrivate) {
      logger.debug(
        { actorAddress },
        "activityService.recordActivity: actor is private — skipping",
      );
      return;
    }

    // 3. Write Activity row
    const activity = await prisma.activity.create({
      data: {
        actorAddress,
        type: type as ActivityType,
        data: payload,
      },
    });

    logger.debug(
      { activityId: activity.id, actorAddress, type },
      "activityService.recordActivity: created",
    );

    // 4. Fetch actor's friends
    const friendAddresses = await getFriendAddresses(actorAddress);

    if (friendAddresses.length === 0) {
      return;
    }

    // 5. Push WS to each friend — use allSettled so one offline friend won't break others
    const wsMessage = JSON.stringify({
      channel: "activity",
      type: "NEW_ACTIVITY",
      payload: { activity },
    });

    await Promise.allSettled(
      friendAddresses.map(async (friendAddress) => {
        connectionManager.sendToAddress(friendAddress as Address, wsMessage);
      }),
    );
  },

  /**
   * Return a paginated activity feed for `viewerAddress`.
   * Feed = activities from the viewer's friends, sorted newest-first.
   */
  async getFeed(
    viewerAddress: string,
    options: { page?: number; pageSize?: number; type?: string } = {},
  ): Promise<Activity[]> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize =
      options.pageSize && options.pageSize > 0 ? options.pageSize : 20;

    const friendAddresses = await getFriendAddresses(viewerAddress);

    if (friendAddresses.length === 0) {
      return [];
    }

    // Build type filter
    const typeFilter =
      options.type && isValidActivityType(options.type)
        ? { type: options.type as ActivityType }
        : {};

    const activities = await prisma.activity.findMany({
      where: {
        actorAddress: { in: friendAddresses },
        ...typeFilter,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return activities;
  },

  /**
   * Add `actorAddress` to the like set for `activityId`.
   * Likes are stored in Redis: SADD activity:likes:{activityId} {actorAddress}
   */
  async like(activityId: string, actorAddress: string): Promise<void> {
    await redis.sadd(`activity:likes:${activityId}`, actorAddress);
    logger.debug({ activityId, actorAddress }, "activityService.like: liked");
  },

  /**
   * Remove `actorAddress` from the like set for `activityId`.
   * SREM activity:likes:{activityId} {actorAddress}
   */
  async unlike(activityId: string, actorAddress: string): Promise<void> {
    await redis.srem(`activity:likes:${activityId}`, actorAddress);
    logger.debug(
      { activityId, actorAddress },
      "activityService.unlike: unliked",
    );
  },
};
