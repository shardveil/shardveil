import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";

/** TTL for presence keys in Redis (seconds). Refreshed on each heartbeat. */
const PRESENCE_TTL_SECONDS = 300; // 5 minutes

/** WebSocket readyState value for an open connection. */
const WS_OPEN = 1;

/** Opaque type alias so callers can't confuse raw WebSocket with WSContext. */
type Socket = WSContext<WebSocket>;

/** Per-address socket set with room subscriptions. */
interface SocketMeta {
  address: Address;
  rooms: Set<string>;
}

/**
 * Central registry of all live WebSocket connections.
 *
 * Design decisions:
 * - Multiple sockets per address (mobile + desktop use-case).
 * - Room membership tracked per-socket so unregister is O(rooms) not O(all-sockets).
 * - All Redis presence operations are fire-and-forget; a Redis blip must not
 *   crash or stall the WebSocket event loop.
 */
class ConnectionManager {
  /** socket → metadata */
  private readonly sockets = new Map<Socket, SocketMeta>();

  /** address → sockets (one address may have many) */
  private readonly byAddress = new Map<Address, Set<Socket>>();

  /** roomId → sockets */
  private readonly byRoom = new Map<string, Set<Socket>>();

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a new WebSocket connection for the given address.
   * Sets a Redis presence key and returns the socket metadata.
   */
  register(address: Address, socket: Socket): void {
    const meta: SocketMeta = { address, rooms: new Set() };
    this.sockets.set(socket, meta);

    if (!this.byAddress.has(address)) {
      this.byAddress.set(address, new Set());
    }
    this.byAddress.get(address)!.add(socket);

    logger.debug({ address }, "WS: connection registered");
    this._setPresence(address).catch(() => {
      /* fire-and-forget */
    });
  }

  /**
   * Unregister a socket on close.
   * Clears presence key from Redis if this was the last socket for the address.
   */
  unregister(socket: Socket): void {
    const meta = this.sockets.get(socket);
    if (!meta) {
      return; // already cleaned up (e.g. double-close)
    }

    const { address, rooms } = meta;
    this.sockets.delete(socket);

    // Remove from address bucket
    const addrSockets = this.byAddress.get(address);
    if (addrSockets) {
      addrSockets.delete(socket);
      if (addrSockets.size === 0) {
        this.byAddress.delete(address);
        // Last socket for this address → clear presence
        this._clearPresence(address).catch(() => {
          /* fire-and-forget */
        });
      }
    }

    // Remove from all room buckets
    for (const roomId of rooms) {
      const roomSockets = this.byRoom.get(roomId);
      if (roomSockets) {
        roomSockets.delete(socket);
        if (roomSockets.size === 0) {
          this.byRoom.delete(roomId);
        }
      }
    }

    logger.debug({ address }, "WS: connection unregistered");
  }

  // ---------------------------------------------------------------------------
  // Room management
  // ---------------------------------------------------------------------------

  /** Subscribe a socket to a room channel. */
  joinRoom(socket: Socket, roomId: string): void {
    const meta = this.sockets.get(socket);
    if (!meta) {
      return;
    }

    meta.rooms.add(roomId);

    if (!this.byRoom.has(roomId)) {
      this.byRoom.set(roomId, new Set());
    }
    this.byRoom.get(roomId)!.add(socket);
  }

  /** Unsubscribe a socket from a room channel. */
  leaveRoom(socket: Socket, roomId: string): void {
    const meta = this.sockets.get(socket);
    if (meta) {
      meta.rooms.delete(roomId);
    }

    const roomSockets = this.byRoom.get(roomId);
    if (roomSockets) {
      roomSockets.delete(socket);
      if (roomSockets.size === 0) {
        this.byRoom.delete(roomId);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sending
  // ---------------------------------------------------------------------------

  /**
   * Broadcast a message to all sockets belonging to `address`.
   * Silently skips sockets that are no longer open.
   */
  sendToAddress(address: Address, message: string): void {
    const addrSockets = this.byAddress.get(address);
    if (!addrSockets || addrSockets.size === 0) {
      return;
    }

    for (const socket of addrSockets) {
      this._safeSend(socket, message);
    }
  }

  /**
   * Broadcast a message to all sockets subscribed to `roomId`.
   * Silently skips sockets that are no longer open.
   */
  sendToRoom(roomId: string, message: string): void {
    const roomSockets = this.byRoom.get(roomId);
    if (!roomSockets || roomSockets.size === 0) {
      return;
    }

    for (const socket of roomSockets) {
      this._safeSend(socket, message);
    }
  }

  // ---------------------------------------------------------------------------
  // Heartbeat helpers
  // ---------------------------------------------------------------------------

  /**
   * Refresh the Redis presence TTL for the given address.
   * Called from the heartbeat pong handler.
   */
  refreshPresence(address: Address): void {
    this._setPresence(address).catch(() => {
      /* fire-and-forget */
    });
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  /** Total number of open sockets across all addresses. */
  getOnlineCount(): number {
    return this.sockets.size;
  }

  /** Number of distinct addresses connected. */
  getAddressCount(): number {
    return this.byAddress.size;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _safeSend(socket: Socket, message: string): void {
    try {
      if (socket.readyState === WS_OPEN) {
        socket.send(message);
      }
    } catch (err) {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "WS: failed to send message",
      );
    }
  }

  private async _setPresence(address: Address): Promise<void> {
    await redis.set(`presence:${address}`, "1", "EX", PRESENCE_TTL_SECONDS);
  }

  private async _clearPresence(address: Address): Promise<void> {
    await redis.del(`presence:${address}`);
  }
}

/**
 * Application-wide singleton connection manager.
 * Import this in wsServer.ts and any channel that needs to push messages.
 */
export const connectionManager = new ConnectionManager();
