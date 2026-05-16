import { serve } from "@hono/node-server";
import { ARBITRUM_SEPOLIA_CHAIN_ID, getAddresses } from "@shardveil/contracts";

import { app } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { redis } from "./config/redis";
import { createWsApp } from "./ws/wsServer";

const VERSION = process.env["npm_package_version"] ?? "0.0.1";

// Mount WebSocket sub-app and obtain the injectWebSocket helper
const { wsApp, injectWebSocket } = createWsApp();
app.route("/ws", wsApp);

const server = serve({ fetch: app.fetch, port: env.PORT }, () => {
  const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      version: VERSION,
      contracts: addresses,
    },
    "ShardVeil API started",
  );
});

// Wire the WebSocket upgrade handler into the Node.js HTTP server.
// This must be called after `serve()` returns the server instance.
injectWebSocket(server);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully...");
  const forceExit = setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();

  if ("closeAllConnections" in server) {
    (server as { closeAllConnections: () => void }).closeAllConnections();
  }

  server.close(async () => {
    clearTimeout(forceExit);
    try {
      await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
      logger.info("Shutdown complete");
      process.exit(0);
    } catch {
      logger.error("Error during shutdown cleanup");
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
