import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";
import { afterAll, beforeEach, vi } from "vitest";

// Mock publicClient — never make real RPC calls in tests
vi.mock("../../src/config/viem", () => ({
  publicClient: {
    getBlockNumber: vi.fn().mockResolvedValue(BigInt(1)),
    readContract: vi.fn().mockResolvedValue(null),
  },
  settlerWallet: vi.fn(),
  warOracleWallet: vi.fn(),
  tournamentOracleWallet: vi.fn(),
  xpOracleWallet: vi.fn(),
  getContract: vi.fn(),
}));

// Lazy-load these after env is set (dotenv loaded in vitest.config.ts)
let prismaClient: PrismaClient | undefined;
let redisClient: Redis | undefined;

beforeEach(async () => {
  if (!prismaClient) {
    const db = await import("../../src/config/database");
    prismaClient = db.prisma;
  }
  if (!redisClient) {
    const r = await import("../../src/config/redis");
    redisClient = r.redis;
  }

  // Truncate all tables in reverse FK order
  await prismaClient.$executeRawUnsafe(`TRUNCATE TABLE "Player" CASCADE`);
  // Flush test Redis DB (DB 1)
  await redisClient.flushdb();
});

afterAll(async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
  if (redisClient) {
    await redisClient.quit();
  }
});
