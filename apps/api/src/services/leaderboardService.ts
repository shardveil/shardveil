/**
 * Leaderboard service — read-through cache with 5min TTL for ranked, guild, and crafter leaderboards.
 *
 * Three endpoints:
 * - getRanked(seasonId, limit)    → Ranked by seasonExp
 * - getGuilds(limit)              → Ranked by warWins
 * - getCrafters(limit)            → Ranked by craftCount
 */

import { prisma } from "../config/database";
import { cacheService } from "./cacheService";
import { logger } from "../config/logger";

/**
 * Ranked leaderboard entry (by seasonExp)
 */
interface LeaderboardEntry {
  rank: number;
  playerAddress: string;
  seasonExp: number;
  battleWins: number;
}

/**
 * Guild leaderboard entry (by warWins)
 */
interface GuildEntry {
  rank: number;
  guildId: string;
  name: string;
  warWins: number;
  memberCount: number;
}

/**
 * Crafter leaderboard entry (by craftCount)
 */
interface CrafterEntry {
  rank: number;
  playerAddress: string;
  craftCount: number;
}

/**
 * Response wrapper with cachedAt timestamp
 */
interface LeaderboardResponse<T> {
  data: T[];
  cachedAt: string;
}

class LeaderboardService {
  /**
   * Get ranked leaderboard for a season (sorted by seasonExp).
   * Uses read-through cache with 5min TTL.
   *
   * @param seasonId - Season to fetch
   * @param limit - Maximum number of entries to return
   * @returns Ranked data with cachedAt timestamp
   */
  async getRanked(
    seasonId: number,
    limit: number,
  ): Promise<LeaderboardResponse<LeaderboardEntry>> {
    const cacheKey = `leaderboard:ranked:${seasonId}`;

    const cached = await cacheService.getOrSet(cacheKey, 300, async () => {
      try {
        const snapshots = await prisma.leaderboardSnapshot.findMany({
          where: { seasonId },
          orderBy: { seasonExp: "desc" },
          take: 100, // Always fetch max 100 from DB
        });

        const data: LeaderboardEntry[] = snapshots.map((snapshot, index) => ({
          rank: index + 1,
          playerAddress: snapshot.playerAddress,
          seasonExp: snapshot.seasonExp,
          battleWins: snapshot.battleWins,
        }));

        return {
          data,
          cachedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error({ error }, "leaderboard getRanked DB error");
        return {
          data: [],
          cachedAt: new Date().toISOString(),
        };
      }
    });

    // Slice to requested limit after retrieval from cache
    return {
      data: cached.data.slice(0, limit),
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Get guild leaderboard (sorted by warWins).
   * Uses read-through cache with 5min TTL.
   *
   * @param limit - Maximum number of guilds to return
   * @returns Guild leaderboard data with cachedAt timestamp
   */
  async getGuilds(limit: number): Promise<LeaderboardResponse<GuildEntry>> {
    const cacheKey = "leaderboard:guilds";

    const cached = await cacheService.getOrSet(cacheKey, 300, async () => {
      try {
        const guilds = await prisma.guild.findMany({
          orderBy: { warWins: "desc" },
          take: 100, // Always fetch max 100 from DB
        });

        const data: GuildEntry[] = guilds.map((guild, index) => ({
          rank: index + 1,
          guildId: guild.id,
          name: guild.name,
          warWins: guild.warWins,
          memberCount: guild.memberCount,
        }));

        return {
          data,
          cachedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error({ error }, "leaderboard getGuilds DB error");
        return {
          data: [],
          cachedAt: new Date().toISOString(),
        };
      }
    });

    // Slice to requested limit after retrieval from cache
    return {
      data: cached.data.slice(0, limit),
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Get crafter leaderboard (sorted by craftCount).
   * Uses read-through cache with 5min TTL.
   *
   * @param limit - Maximum number of entries to return
   * @returns Crafter leaderboard data with cachedAt timestamp
   */
  async getCrafters(
    limit: number,
  ): Promise<LeaderboardResponse<CrafterEntry>> {
    const cacheKey = "leaderboard:crafters";

    const cached = await cacheService.getOrSet(cacheKey, 300, async () => {
      try {
        const snapshots = await prisma.leaderboardSnapshot.findMany({
          orderBy: { craftCount: "desc" },
          take: 100, // Always fetch max 100 from DB
        });

        const data: CrafterEntry[] = snapshots.map((snapshot, index) => ({
          rank: index + 1,
          playerAddress: snapshot.playerAddress,
          craftCount: snapshot.craftCount,
        }));

        return {
          data,
          cachedAt: new Date().toISOString(),
        };
      } catch (error) {
        logger.error({ error }, "leaderboard getCrafters DB error");
        return {
          data: [],
          cachedAt: new Date().toISOString(),
        };
      }
    });

    // Slice to requested limit after retrieval from cache
    return {
      data: cached.data.slice(0, limit),
      cachedAt: cached.cachedAt,
    };
  }
}

/**
 * Export leaderboard service singleton.
 */
export const leaderboardService = new LeaderboardService();
