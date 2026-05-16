import { logger } from "../config/logger";
import { redis } from "../config/redis";

/**
 * Typed cache service wrapping ioredis with JSON serialization and TTL support.
 *
 * Cache key patterns used throughout the application:
 *
 * - nonce:{nonce}                     → SIWE nonce, TTL 5min
 * - presence:{address}                → online presence, TTL 5min
 * - revoked:jwt:{tokenId}             → JWT blacklist, TTL = token remaining lifetime
 * - profile:{address}                 → player profile cache, TTL 5min
 * - username:{address}                → on-chain username, TTL 5min
 * - cards:all                         → full card list, TTL 24h
 * - cards:{cardId}                    → single card, TTL 5min
 * - leaderboard:ranked:{seasonId}     → ranked leaderboard, TTL 5min
 * - leaderboard:guilds                → guild leaderboard, TTL 5min
 * - leaderboard:crafters              → crafter leaderboard, TTL 5min
 * - ratelimit:{name}:{key}            → rate limit window, TTL = window
 * - admin:role:{address}:{contract}:{role} → role check cache, TTL 30s
 */

class CacheService {
  /**
   * Retrieve a value from cache and deserialize as JSON.
   * Returns null if key does not exist or on error.
   *
   * @param key — cache key
   * @returns parsed value or null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, "Cache get error");
      return null;
    }
  }

  /**
   * Set a value in cache with JSON serialization and TTL.
   *
   * @param key — cache key
   * @param value — value to cache
   * @param ttlSeconds — time to live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      logger.error({ error, key, ttlSeconds }, "Cache set error");
    }
  }

  /**
   * Delete a key from cache.
   *
   * @param key — cache key
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ error, key }, "Cache del error");
    }
  }

  /**
   * Invalidate all cache keys matching a pattern using SCAN and DEL.
   * This is non-blocking and safe for large keysets.
   *
   * @param pattern — Redis glob pattern (e.g., "leaderboard:*")
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = "0";
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== "0");

      if (deletedCount > 0) {
        logger.debug(
          { pattern, count: deletedCount },
          "Cache pattern invalidated",
        );
      }
    } catch (error) {
      logger.error({ error, pattern }, "Cache invalidatePattern error");
    }
  }

  /**
   * Read-through cache: get from cache, or call factory and cache the result.
   * Useful for expensive computations or external API calls.
   *
   * @param key — cache key
   * @param ttlSeconds — time to live for cached value
   * @param factory — async function to compute the value on cache miss
   * @returns cached or newly computed value
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss — compute value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Health check method to verify Redis connectivity.
   * Returns true if Redis is reachable and responding.
   *
   * @returns true if Redis is healthy, false otherwise
   */
  async ping(): Promise<boolean> {
    try {
      const result = await redis.ping();
      return result === "PONG";
    } catch (error) {
      logger.error({ error }, "Cache ping error");
      return false;
    }
  }
}

/**
 * Export cache service singleton.
 */
export const cacheService = new CacheService();
