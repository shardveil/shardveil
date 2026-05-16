import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { logger } from "./config/logger";
import { prisma } from "./config/database";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { publicClient } from "./config/viem";
import { cacheService } from "./services/cacheService";
import { loggerMiddleware } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { standardLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { profileRouter } from "./routes/profile";
import { cardsRouter } from "./routes/cards";
import { leaderboardRouter } from "./routes/leaderboard";

const app = new Hono();

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

app.get("/", (c) => c.text("ShardVeil API"));

// Comprehensive health check endpoint
app.get("/health", async (c) => {
  const [dbResult, redisResult, rpcResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    cacheService.ping(),
    Promise.race([
      publicClient.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 5000),
      ),
    ]),
  ]);

  const database = dbResult.status === "fulfilled" ? "ok" : "down";
  const redis_status = redisResult.status === "fulfilled" && redisResult.value === true ? "ok" : "down";
  const rpc = rpcResult.status === "fulfilled" ? "ok" : "down";
  const allOk = database === "ok" && redis_status === "ok" && rpc === "ok";

  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      uptime: process.uptime(),
      version: process.env["npm_package_version"] ?? "0.0.1",
      services: { database, redis: redis_status, rpc },
    },
    allOk ? 200 : 503,
  );
});

const server = serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, version: process.env["npm_package_version"] ?? "0.0.1" },
    "ShardVeil API started",
  );
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");
  server.close(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);
    logger.info("Shutdown complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
