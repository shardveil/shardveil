import type { Guild, Player } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | undefined;

/**
 * Lazy-load Prisma instance to ensure .env.test is loaded first.
 */
async function getPrisma(): Promise<PrismaClient> {
  if (!prismaInstance) {
    const { prisma } = await import("../../src/config/database");
    prismaInstance = prisma;
  }
  return prismaInstance;
}

/**
 * Generate a random Ethereum-like address for testing.
 */
function randomAddress(): string {
  const hex = [...Array(40)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
  return `0x${hex}`;
}

/**
 * Create a Player record in the test database with optional overrides.
 */
export async function createPlayer(
  overrides: Partial<Player> = {},
): Promise<Player> {
  const p = await getPrisma();
  return p.player.create({
    data: {
      address: overrides.address ?? randomAddress(),
      username: overrides.username ?? null,
      bio: overrides.bio ?? null,
      avatarCid: overrides.avatarCid ?? null,
      twitterHandle: overrides.twitterHandle ?? null,
      discordHandle: overrides.discordHandle ?? null,
      isPrivate: overrides.isPrivate ?? false,
    },
  });
}

/**
 * Create a Guild record in the test database with optional overrides.
 */
export async function createGuild(
  overrides: Partial<Guild> = {},
): Promise<Guild> {
  const p = await getPrisma();
  return p.guild.create({
    data: {
      name: overrides.name ?? `Guild-${Math.random().toString(36).slice(2, 8)}`,
      description: overrides.description ?? null,
      logoUrl: overrides.logoUrl ?? null,
      ownerAddress: overrides.ownerAddress ?? randomAddress(),
      memberCount: overrides.memberCount ?? 0,
      warWins: overrides.warWins ?? 0,
    },
  });
}
