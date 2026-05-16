import Redis from "ioredis";

import { env } from "./env";
import { logger } from "./logger";

/**
 * Redis client singleton with linear backoff reconnection strategy.
 *
 * Configuration:
 * - maxRetriesPerRequest: null — allows pipelined requests
 * - enableOfflineQueue: false — fails fast instead of queuing commands
 * - retryStrategy: linear backoff (100ms × attempt, max 3s), not exponential
 * - max 5 retries before exiting process
 *
 * The Redis instance is created and cached on first import.
 * If Redis is unavailable at boot, the process will retry with backoff
 * and eventually exit if max retries are exceeded.
 */

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  redisInstance = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 5) {
        logger.error("Redis max retries exceeded — exiting process");
        process.exit(1);
      }

      const backoffMs = Math.min(times * 100, 3000);
      logger.warn(
        { attempt: times, backoffMs },
        "Redis reconnecting with linear backoff",
      );
      return backoffMs;
    },
  });

  // Log connection events
  redisInstance.on("connect", () => {
    logger.info("Redis connected");
  });

  redisInstance.on("error", (error) => {
    logger.error({ error }, "Redis error");
  });

  redisInstance.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return redisInstance;
}

/**
 * Export the singleton instance for use throughout the application.
 * Calling getRedis() multiple times returns the same instance.
 */
export const redis = getRedis();
