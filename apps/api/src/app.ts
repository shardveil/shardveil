import { Hono } from "hono";
import { cors } from "hono/cors";

import { prisma } from "./config/database";
import { env } from "./config/env";
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
  const allOk = database === "ok" && redisStatus === "ok" && rpc === "ok";

  return c.json(
    {
      status: allOk ? "ok" : "degraded",
      uptime: process.uptime(),
      version: VERSION,
      services: { database, redis: redisStatus, rpc },
    },
    allOk ? 200 : 503,
  );
});
