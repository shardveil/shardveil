/**
 * Notification Service — Task 4.4
 *
 * Handles creation, delivery, and lifecycle of player notifications.
 *
 * Responsibilities:
 * - Write notifications to the database
 * - Push notifications via WebSocket if the recipient is online
 * - Cache unread counts in Redis (TTL: 5 min)
 * - Mark individual or all notifications as read
 * - Paginated list retrieval with optional type filtering
 *
 * Redis cache key: `cache:notifications:unread:{address}` (string → count)
 */

import type { Notification, NotificationType, Prisma } from "@prisma/client";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";
import { connectionManager } from "../ws/connectionManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Redis key prefix for unread-count cache. */
const UNREAD_CACHE_PREFIX = "cache:notifications:unread:";

/** TTL for the unread-count cache entry (seconds). */
const UNREAD_CACHE_TTL_SECONDS = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { Notification, NotificationType, Prisma };

export interface NotificationListOptions {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// WS push helpers
// ---------------------------------------------------------------------------

/**
 * Build the WS push envelope for a new notification.
 */
function buildPushEnvelope(notification: Notification): string {
  return JSON.stringify({
    channel: "notification",
    type: "NEW",
    payload: { notification },
  });
}

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

function unreadCacheKey(address: string): string {
  return `${UNREAD_CACHE_PREFIX}${address}`;
}

/**
 * Invalidate (delete) the unread-count cache for an address.
 * Fire-and-forget — a Redis blip must not crash the caller.
 */
async function invalidateUnreadCache(address: string): Promise<void> {
  try {
    await redis.del(unreadCacheKey(address));
  } catch (err) {
    logger.warn(
      { address, error: err instanceof Error ? err.message : String(err) },
      "notification: failed to invalidate unread cache",
    );
  }
}

/**
 * Decrement the unread-count cache for an address by `by`.
 * Uses atomic DECRBY to avoid race conditions.
 * If the result goes negative, clamps to 0.
 * Fire-and-forget.
 */
async function decrementUnreadCache(
  address: string,
  by: number,
): Promise<void> {
  if (by <= 0) return;
  try {
    const key = unreadCacheKey(address);
    const result = await redis.decrby(key, by);
    if (result < 0) {
      await redis.set(key, "0", "EX", UNREAD_CACHE_TTL_SECONDS);
    }
  } catch (err) {
    logger.warn(
      { address, error: err instanceof Error ? err.message : String(err) },
      "notification: failed to decrement unread cache",
    );
  }
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Create a notification for a player.
 *
 * Always writes to the database. If the recipient is online, pushes
 * via WebSocket immediately. Invalidates the unread-count cache.
 *
 * @param playerAddress - Recipient Ethereum address
 * @param type          - NotificationType enum value
 * @param payload       - Arbitrary JSON payload stored in `data`
 * @returns             The created Notification record
 */
export async function create(
  playerAddress: Address,
  type: NotificationType,
  payload: Record<string, unknown>,
): Promise<Notification> {
  // 1. Write to DB
  const notification = await prisma.notification.create({
    data: {
      playerAddress,
      type,
      data: payload as Prisma.InputJsonValue,
    },
  });

  logger.debug(
    { id: notification.id, playerAddress, type },
    "notification: created",
  );

  // 2. Invalidate unread cache (count just went up)
  await invalidateUnreadCache(playerAddress);

  // 3. Push via WS if online — connectionManager.sendToAddress is a no-op when
  //    the address has no connected sockets.
  try {
    connectionManager.sendToAddress(
      playerAddress,
      buildPushEnvelope(notification),
    );
  } catch (err) {
    // WS push failure must never break notification creation
    logger.warn(
      {
        id: notification.id,
        playerAddress,
        error: err instanceof Error ? err.message : String(err),
      },
      "notification: WS push failed (stored in DB, will be delivered on next login)",
    );
  }

  return notification;
}

/**
 * Mark one or more notifications as read for a player.
 *
 * Only updates notifications that belong to the player and are currently unread.
 * Decrements the unread-count cache by the number of rows actually updated.
 *
 * @param playerAddress    - Owner address (used as auth guard)
 * @param notificationIds  - IDs of notifications to mark read
 */
export async function markRead(
  playerAddress: Address,
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;

  const { count } = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      playerAddress,
      readAt: null, // only update unread ones
    },
    data: {
      readAt: new Date(),
    },
  });

  logger.debug(
    { playerAddress, count, notificationIds },
    "notification: marked read",
  );

  // Decrement cache by how many were actually flipped
  await decrementUnreadCache(playerAddress, count);
}

/**
 * Mark ALL unread notifications as read for a player.
 * Invalidates the unread-count cache (sets to 0 effectively by deletion).
 *
 * @param playerAddress - Owner address
 */
export async function markAllRead(playerAddress: Address): Promise<void> {
  const { count } = await prisma.notification.updateMany({
    where: {
      playerAddress,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  logger.debug({ playerAddress, count }, "notification: marked all read");

  // Delete cache key — next read will recompute as 0
  await invalidateUnreadCache(playerAddress);
}

/**
 * Get the number of unread notifications for a player.
 *
 * Uses Redis as a read-through cache (TTL 5 min). On cache miss, queries
 * the DB and caches the result.
 *
 * @param playerAddress - Owner address
 * @returns             Unread notification count
 */
export async function getUnreadCount(playerAddress: Address): Promise<number> {
  const key = unreadCacheKey(playerAddress);

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
  } catch (err) {
    logger.warn(
      {
        playerAddress,
        error: err instanceof Error ? err.message : String(err),
      },
      "notification: cache read failed, falling back to DB",
    );
  }

  // Cache miss — query DB
  const count = await prisma.notification.count({
    where: {
      playerAddress,
      readAt: null,
    },
  });

  // Store in cache (fire-and-forget)
  redis.set(key, String(count), "EX", UNREAD_CACHE_TTL_SECONDS).catch((err) => {
    logger.warn(
      {
        playerAddress,
        error: err instanceof Error ? err.message : String(err),
      },
      "notification: failed to cache unread count",
    );
  });

  return count;
}

/**
 * List notifications for a player with pagination and optional type filter.
 *
 * Results are ordered by createdAt DESC (newest first).
 *
 * @param playerAddress - Owner address
 * @param options       - Pagination and filter options
 * @returns             Paginated notification list
 */
export async function list(
  playerAddress: Address,
  options: NotificationListOptions = {},
): Promise<PaginatedNotifications> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = {
    playerAddress,
    ...(options.type ? { type: options.type } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total, page, pageSize };
}
