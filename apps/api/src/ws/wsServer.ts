import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";

import { logger } from "../config/logger";
import type { Address } from "../config/viem";
import { registerNotificationChannel } from "./channels/notificationChannel";
import {
  cleanupPresence,
  registerPresenceChannel,
} from "./channels/presenceChannel";
import { connectionManager } from "./connectionManager";
import { messageRouter } from "./messageRouter";
import { verifyWsToken, WS_CLOSE_UNAUTHORIZED } from "./middleware/wsAuth";
import { cleanupRateLimit } from "./middleware/wsRateLimit";

// Register all channel handlers at module load time.
registerPresenceChannel();
registerNotificationChannel();

/** Ping interval in milliseconds. */
const PING_INTERVAL_MS = 30_000;

/** How long to wait for a pong before disconnecting (ms). */
const PONG_TIMEOUT_MS = 10_000;

/** WebSocket readyState value for an open connection. */
const WS_OPEN = 1;

/**
 * Create a Hono sub-app that handles the `/ws` upgrade endpoint, and return
 * both the app and the `injectWebSocket` function needed to wire it into the
 * Node.js HTTP server.
 *
 * Usage in `index.ts`:
 * ```ts
 * const { wsApp, injectWebSocket } = createWsApp();
 * app.route('/ws', wsApp);
 * const server = serve({ fetch: app.fetch, port: env.PORT });
 * injectWebSocket(server);
 * ```
 */
export function createWsApp(): {
  wsApp: Hono;
  injectWebSocket: ReturnType<typeof createNodeWebSocket>["injectWebSocket"];
} {
  const wsApp = new Hono();

  const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({
    app: wsApp,
  });

  wsApp.get(
    "/",
    upgradeWebSocket((c) => {
      // Extract token from query param before upgrade
      const token = c.req.query("token");

      // Per-connection mutable state
      let address: Address | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;
      let pongTimer: ReturnType<typeof setTimeout> | null = null;

      function stopHeartbeat() {
        if (pingTimer !== null) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (pongTimer !== null) {
          clearTimeout(pongTimer);
          pongTimer = null;
        }
      }

      return {
        // ------------------------------------------------------------------
        // onOpen: authenticate then register; reject immediately if invalid
        // ------------------------------------------------------------------
        async onOpen(_event, ws) {
          let verified: Address;
          try {
            verified = await verifyWsToken(token);
          } catch (err) {
            logger.warn(
              { error: err instanceof Error ? err.message : String(err) },
              "WS: rejected connection — auth failed",
            );
            ws.close(WS_CLOSE_UNAUTHORIZED, "Unauthorized");
            return;
          }

          address = verified;
          connectionManager.register(address, ws);
          logger.info({ address }, "WS: client connected");

          // ------------------------------------------------------------------
          // Heartbeat: server pings every PING_INTERVAL_MS, client must pong
          // within PONG_TIMEOUT_MS or the connection is terminated.
          // ------------------------------------------------------------------
          pingTimer = setInterval(() => {
            if (ws.readyState !== WS_OPEN) {
              stopHeartbeat();
              return;
            }

            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch {
              stopHeartbeat();
              return;
            }

            if (pongTimer === null) {
              pongTimer = setTimeout(() => {
                logger.warn(
                  { address },
                  "WS: pong timeout — closing stale connection",
                );
                ws.close(1001, "Pong timeout");
              }, PONG_TIMEOUT_MS);
            }
          }, PING_INTERVAL_MS);
        },

        // ------------------------------------------------------------------
        // onMessage: intercept pong frames; forward everything else to the
        // message router (rate-limited, Zod-validated, channel-dispatched).
        // ------------------------------------------------------------------
        onMessage(event, ws) {
          if (typeof event.data !== "string") {
            return; // ignore binary frames
          }

          // Fast-path: intercept pong without JSON-parsing overhead
          // Pong arrives as `{ "type": "pong" }` — check cheaply first.
          let msg: unknown;
          try {
            msg = JSON.parse(event.data);
          } catch {
            // Malformed JSON — delegate to router so it closes with 4002
            if (address !== null) {
              messageRouter.route(ws, address, event.data).catch(() => {
                /* already handled inside route() */
              });
            }
            return;
          }

          if (
            typeof msg === "object" &&
            msg !== null &&
            (msg as Record<string, unknown>)["type"] === "pong"
          ) {
            // Cancel the disconnect timeout
            if (pongTimer !== null) {
              clearTimeout(pongTimer);
              pongTimer = null;
            }

            // Refresh Redis presence TTL
            if (address !== null) {
              connectionManager.refreshPresence(address);
            }
            return;
          }

          // All other messages → channel router
          if (address !== null) {
            messageRouter.route(ws, address, event.data).catch(() => {
              /* errors are handled and logged inside route() */
            });
          }
        },

        // ------------------------------------------------------------------
        // onClose: clean up heartbeat timers, rate-limit state, and registry
        // ------------------------------------------------------------------
        onClose(_event, ws) {
          stopHeartbeat();
          cleanupRateLimit(ws);
          cleanupPresence(ws);
          if (address !== null) {
            connectionManager.unregister(ws);
          }
          logger.debug({ address }, "WS: connection closed");
        },

        // ------------------------------------------------------------------
        // onError: log and stop heartbeat — onClose fires after and handles unregister
        // ------------------------------------------------------------------
        onError(_event, _ws) {
          logger.error({ address }, "WS: socket error");
          stopHeartbeat();
          // onClose will fire after this and handle unregister
        },
      };
    }),
  );

  return { wsApp, injectWebSocket };
}
