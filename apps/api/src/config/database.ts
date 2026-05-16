/**
 * Prisma Client Singleton
 *
 * Uses the globalThis pattern to avoid creating multiple PrismaClient instances
 * in development (e.g. during Next.js / tsx HMR hot-reloads).
 *
 * In production, a fresh instance is created once and reused for the lifetime
 * of the process.
 *
 * Query logging:
 *   - development: all queries + info + warn + error (printed to stdout)
 *   - production:  only slow queries (>200 ms) and errors (emitted as events)
 */

import { type Prisma, PrismaClient } from "@prisma/client";

import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (env.NODE_ENV === "development") {
    return new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });
  }

  // Production: emit events so we can attach structured logging / alerting
  const client = new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
      // Prisma emits query events for ALL queries; we filter by duration client-side.
      // There is no way to emit only slow queries at the Prisma level (known limitation).
      { level: "query", emit: "event" },
    ],
  });

  // Filter slow queries (>200 ms) in production
  (
    client as unknown as {
      $on: (event: string, cb: (e: Prisma.QueryEvent) => void) => void;
    }
  ).$on("query", (e: Prisma.QueryEvent) => {
    if (e.duration >= 200) {
      console.warn(`[prisma:slow] ${e.duration}ms — ${e.query}`);
    }
  });

  return client;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
