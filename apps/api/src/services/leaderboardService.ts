/**
 * Leaderboard service — read-through cache with 5min TTL for ranked, guild, and crafter leaderboards.
 *
 * Three endpoints:
 * - getRanked(seasonId, limit)    → Ranked by seasonExp
 * - getGuilds(limit)              → Ranked by warWins
 * - getCrafters(seasonId, limit)  → Ranked by craftCount
 */

import { prisma } from "../config/database";
import { cacheService } from "./cacheService";

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
 * Response wrapper with updatedAt timestamp
 */
interface LeaderboardResponse<T> {
  data: T[];
  updatedAt: string;
}

class LeaderboardService {
  /**
   * Get ranked leaderboard for a season (sorted by seasonExp).
   * Uses read-through cache with 5min TTL.
   *
   * @param seasonId - Season to fetch
   * @param limit - Maximum number of entries to return (no upper bound enforced here)
   * @returns Ranked data with updatedAt timestamp
   */
  async getRanked(
    seasonId: number,
    limit: number,
  ): Promise<LeaderboardResponse<LeaderboardEntry>> {
    const cacheKey = `leaderboard:ranked:${seasonId}`;

    return cacheService.getOrSet(cacheKey, 300, async () => {
      const snapshots = await prisma.leaderboardSnapshot.findMany({
        where: { seasonId },
        orderBy: { seasonExp: "desc" },
        take: limit,
      });

      const data: LeaderboardEntry[] = snapshots.map((snapshot, index) => ({
        rank: index + 1,
        playerAddress: snapshot.playerAddress,
        seasonExp: snapshot.seasonExp,
        battleWins: snapshot.battleWins,
      }));

      return {
        data,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Get guild leaderboard (sorted by warWins).
   * Uses read-through cache with 5min TTL.
   *
   * @param limit - Maximum number of guilds to return (no upper bound enforced here)
   * @returns Guild leaderboard data with updatedAt timestamp
   */
  async getGuilds(limit: number): Promise<LeaderboardResponse<GuildEntry>> {
    const cacheKey = "leaderboard:guilds";

    return cacheService.getOrSet(cacheKey, 300, async () => {
      const guilds = await prisma.guild.findMany({
        orderBy: { warWins: "desc" },
        take: limit,
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
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Get crafter leaderboard for a season (sorted by craftCount).
   * Uses read-through cache with 5min TTL.
   *
   * @param seasonId - Season to fetch
   * @param limit - Maximum number of entries to return (no upper bound enforced here)
   * @returns Crafter leaderboard data with updatedAt timestamp
   */
  async getCrafters(
    seasonId: number,
    limit: number,
  ): Promise<LeaderboardResponse<CrafterEntry>> {
    const cacheKey = `leaderboard:crafters:${seasonId}`;

    return cacheService.getOrSet(cacheKey, 300, async () => {
      const snapshots = await prisma.leaderboardSnapshot.findMany({
        where: { seasonId },
        orderBy: { craftCount: "desc" },
        take: limit,
      });

      const data: CrafterEntry[] = snapshots.map((snapshot, index) => ({
        rank: index + 1,
        playerAddress: snapshot.playerAddress,
        craftCount: snapshot.craftCount,
      }));

      return {
        data,
        updatedAt: new Date().toISOString(),
      };
    });
  }
}

/**
 * Export leaderboard service singleton.
 */
export const leaderboardService = new LeaderboardService();
