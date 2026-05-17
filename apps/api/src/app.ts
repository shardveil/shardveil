import { Hono } from "hono";
import { cors } from "hono/cors";

import { prisma } from "./config/database";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { publicClient } from "./config/viem";
import { errorHandler } from "./middleware/errorHandler";
import { loggerMiddleware } from "./middleware/logger";
import { standardLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { cardsRouter } from "./routes/cards";
import { leaderboardRouter } from "./routes/leaderboard";
import { messagesRouter } from "./routes/messages";
import { notificationRouter } from "./routes/notification";
import { profileRouter } from "./routes/profile";
import { socialRouter } from "./routes/social";
import { cacheService } from "./services/cacheService";
import { INDEXED_CONTRACT_NAMES } from "./workers/eventIndexer";

const VERSION = process.env["npm_package_version"] ?? "0.0.1";

export const app = new Hono();

// Middleware order: logger → CORS → rate limit → error handler
app.use(loggerMiddleware);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(standardLimit);

app.onError(errorHandler);

// Routes
app.route("/auth", authRouter);
app.route("/profile", profileRouter);
app.route("/cards", cardsRouter);
app.route("/leaderboard", leaderboardRouter);
app.route("/notifications", notificationRouter);
app.route("/messages", messagesRouter);
app.route("/social", socialRouter);

app.get("/", (c) => c.text("ShardVeil API"));

// Comprehensive health check endpoint
app.get("/health", async (c) => {
  const [dbResult, redisResult, rpcResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    cacheService.ping(),
    new Promise<bigint>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("RPC timeout")),
        5000,
      );
      publicClient
        .getBlockNumber()
        .then((n) => {
          clearTimeout(timeoutId);
          resolve(n);
        })
        .catch((e) => {
          clearTimeout(timeoutId);
          reject(e as Error);
        });
    }),
  ]);

  const database = dbResult.status === "fulfilled" ? "ok" : "down";
  const redisStatus =
    redisResult.status === "fulfilled" && redisResult.value === true
      ? "ok"
      : "down";
  const rpc = rpcResult.status === "fulfilled" ? "ok" : "down";

  // Worker heartbeat check
  const workerNames = [
    "vrfWatcher",
    "eventIndexer",
    "settlementSigner",
    "tournamentWorker",
    "xpSigner",
    "activityGenerator",
  ] as const;

  const workers: Record<string, "ok" | "stalled" | "lagging"> = {};
  let anyWorkerStalled = false;

  for (const workerName of workerNames) {
    try {
      const heartbeatKey = `worker:heartbeat:${workerName}`;
      const heartbeatExists = await redis.exists(heartbeatKey);

      if (!heartbeatExists) {
        workers[workerName] = "stalled";
        anyWorkerStalled = true;
      } else {
        // Check for eventIndexer lag specifically
        if (workerName === "eventIndexer") {
          try {
            let maxBlockIndexed = 0n;

            // Get the max block number across all indexed contracts
            for (const contractName of INDEXED_CONTRACT_NAMES) {
              const blockStr = await redis.get(
                `indexer:lastBlock:${contractName}`,
              );
              if (blockStr) {
                const blockNum = BigInt(blockStr);
                if (blockNum > maxBlockIndexed) {
                  maxBlockIndexed = blockNum;
                }
              }
            }

            // Get current chain block number
            if (rpcResult.status === "fulfilled") {
              const currentBlock = rpcResult.value;
              const lag = currentBlock - maxBlockIndexed;

              if (lag > 100n) {
                workers[workerName] = "lagging";
              } else {
                workers[workerName] = "ok";
              }
            } else {
              // If RPC is down, we can't determine lag, so mark as ok if heartbeat exists
              workers[workerName] = "ok";
            }
          } catch {
            // If lag check fails, fall back to heartbeat status
            workers[workerName] = "ok";
          }
        } else {
          workers[workerName] = "ok";
        }
      }
    } catch {
      // If Redis check fails for this worker, treat as stalled
      workers[workerName] = "stalled";
      anyWorkerStalled = true;
    }
  }

  const allOk =
    database === "ok" &&
    redisStatus === "ok" &&
    rpc === "ok" &&
    !anyWorkerStalled;

  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      uptime: process.uptime(),
      version: VERSION,
      services: { database, redis: redisStatus, rpc },
      workers,
    },
    allOk ? 200 : 503,
  );
});
