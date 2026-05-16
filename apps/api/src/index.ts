import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { prisma } from "./config/database";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";

const app = new Hono();

app.onError(errorHandler);

app.route("/auth", authRouter);

app.get("/", (c) => c.text("ShardVeil API"));

app.get("/health", async (c) => {
  let dbStatus: "ok" | "error" = "ok";
  let playerCount: number | null = null;

  try {
    playerCount = await prisma.player.count();
  } catch {
    dbStatus = "error";
  }

  return c.json({
    status: "ok",
    uptime: process.uptime(),
    version: process.env["npm_package_version"] ?? "0.0.1",
    db: { status: dbStatus, playerCount },
  });
});

serve({ fetch: app.fetch, port: env.PORT }, () => {
  console.log(`ShardVeil API listening on http://localhost:${env.PORT}`);
});
