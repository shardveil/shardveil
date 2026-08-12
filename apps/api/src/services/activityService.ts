/**
 * Activity Service — Task 4.12
 *
 * Provides:
 *   - recordActivity: write Activity to DB + push WS to friends
 *   - getFeed: paginated friend activity feed, annotated with like state
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

/** Redis set of addresses that liked `activityId`. One helper, one format. */
function likesKey(activityId: string): string {
  return `activity:likes:${activityId}`;
}

/** An activity plus the viewer-specific like state the feed renders. */
export interface FeedActivity extends Activity {
  likeCount: number;
  hasLiked: boolean;
}

/**
 * Fetch like counts and the viewer's own like state for a page of activities,
 * in one Redis round-trip rather than two commands per row.
 *
 * Degrades to zeroed like state instead of failing the feed — a like counter
 * is not worth a 500 when the activities themselves loaded fine.
 */
async function annotateWithLikes(
  activities: Activity[],
  viewerAddress: string,
): Promise<FeedActivity[]> {
  if (activities.length === 0) {
    return [];
  }

  const zeroed = (): FeedActivity[] =>
    activities.map((a) => ({ ...a, likeCount: 0, hasLiked: false }));

  let replies: [Error | null, unknown][] | null;
  try {
    const pipeline = redis.pipeline();
    for (const activity of activities) {
      pipeline.scard(likesKey(activity.id));
      pipeline.sismember(likesKey(activity.id), viewerAddress);
    }
    replies = (await pipeline.exec()) as [Error | null, unknown][] | null;
  } catch (err) {
    logger.warn(
      { error: err instanceof Error ? err.message : String(err) },
      "activityService.getFeed: like lookup failed, serving feed without counts",
    );
    return zeroed();
  }

  // ioredis returns null when the whole pipeline fails.
  if (!replies || replies.length !== activities.length * 2) {
    return zeroed();
  }

  return activities.map((activity, i) => {
    const [countErr, count] = replies[i * 2]!;
    const [likedErr, liked] = replies[i * 2 + 1]!;
    return {
      ...activity,
      likeCount: countErr ? 0 : Number(count ?? 0),
      hasLiked: likedErr ? false : Number(liked ?? 0) === 1,
    };
  });
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
   * Return a paginated activity feed for `viewerAddress`, each entry carrying
   * its like count and whether the viewer has liked it.
   * Feed = activities from the viewer's friends, sorted newest-first.
   */
  async getFeed(
    viewerAddress: string,
    options: { page?: number; pageSize?: number; type?: string } = {},
  ): Promise<FeedActivity[]> {
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

    return annotateWithLikes(activities, viewerAddress);
  },

  /**
   * Add `actorAddress` to the like set for `activityId`.
   * Likes are stored in Redis: SADD activity:likes:{activityId} {actorAddress}
   */
  async like(activityId: string, actorAddress: string): Promise<void> {
    await redis.sadd(likesKey(activityId), actorAddress);
    logger.debug({ activityId, actorAddress }, "activityService.like: liked");
  },

  /**
   * Remove `actorAddress` from the like set for `activityId`.
   * SREM activity:likes:{activityId} {actorAddress}
   */
  async unlike(activityId: string, actorAddress: string): Promise<void> {
    await redis.srem(likesKey(activityId), actorAddress);
    logger.debug(
      { activityId, actorAddress },
      "activityService.unlike: unliked",
    );
  },
};
