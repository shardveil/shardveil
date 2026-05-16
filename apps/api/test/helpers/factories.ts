import type { Player } from "@prisma/client";

import { prisma } from "../../src/config/database";

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
  return prisma.player.create({
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
