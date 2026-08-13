import { randomUUID } from "node:crypto";

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { logger } from "../config/logger";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";

/** TTL for presence keys in Redis (seconds). Refreshed on each heartbeat. */
const PRESENCE_TTL_SECONDS = 300; // 5 minutes

/** WebSocket readyState value for an open connection. */
const WS_OPEN = 1;

/** Pub/sub channel every API instance publishes outbound WS messages to. */
const FANOUT_CHANNEL = "ws:fanout";

/** Opaque type alias so callers can't confuse raw WebSocket with WSContext. */
type Socket = WSContext<WebSocket>;

/** Per-address socket set with room subscriptions. */
interface SocketMeta {
  address: Address;
  rooms: Set<string>;
}

/**
 * One outbound WS message, relayed to the instances that hold the sockets.
 * `payload` is already-serialized — fanout never re-encodes it.
 */
interface FanoutMessage {
  /** Publishing instance, so it can skip its own echo. */
  from: string;
  kind: "address" | "room";
  target: string;
  payload: string;
}

/**
 * Central registry of all live WebSocket connections.
 *
 * Design decisions:
 * - Multiple sockets per address (mobile + desktop use-case).
 * - Room membership tracked per-socket so unregister is O(rooms) not O(all-sockets).
 * - All Redis presence operations are fire-and-forget; a Redis blip must not
 *   crash or stall the WebSocket event loop.
 * - Sockets live in this process, so sends are delivered locally first and
 *   then published for the other instances (see `_publish`). Presence is
 *   shared through Redis, so without that relay a second instance would show
 *   a player online and silently drop every message aimed at them.
 */
class ConnectionManager {
  /** Identifies this process on the fanout channel. */
  private readonly instanceId = randomUUID();

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
   * Broadcast a message to all sockets belonging to `address`, on this
   * instance and every other one.
   */
  sendToAddress(address: Address, message: string): void {
    this._deliverToAddress(address, message);
    this._publish("address", address, message);
  }

  /**
   * Broadcast a message to all sockets subscribed to `roomId`, on this
   * instance and every other one.
   */
  sendToRoom(roomId: string, message: string): void {
    this._deliverToRoom(roomId, message);
    this._publish("room", roomId, message);
  }

  // ---------------------------------------------------------------------------
  // Cross-instance fanout
  // ---------------------------------------------------------------------------

  /**
   * Deliver a message that arrived on the fanout channel. Published by
   * another instance — our own echo is dropped here.
   */
  receiveFanout(raw: string): void {
    let msg: FanoutMessage;
    try {
      msg = JSON.parse(raw) as FanoutMessage;
    } catch {
      logger.warn("WS: dropped malformed fanout message");
      return;
    }

    if (msg.from === this.instanceId) {
      return;
    }

    if (msg.kind === "address") {
      this._deliverToAddress(msg.target as Address, msg.payload);
    } else {
      this._deliverToRoom(msg.target, msg.payload);
    }
  }

  /**
   * Relay a message to the other instances. Fire-and-forget for the same
   * reason presence is: a Redis blip must not stall the WS event loop. The
   * local delivery has already happened by the time this runs.
   */
  private _publish(
    kind: FanoutMessage["kind"],
    target: string,
    payload: string,
  ): void {
    const msg: FanoutMessage = {
      from: this.instanceId,
      kind,
      target,
      payload,
    };

    redis.publish(FANOUT_CHANNEL, JSON.stringify(msg)).catch((err) => {
      logger.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "WS: fanout publish failed — message delivered locally only",
      );
    });
  }

  /** Send to this instance's sockets for `address`. Skips closed sockets. */
  private _deliverToAddress(address: Address, message: string): void {
    const addrSockets = this.byAddress.get(address);
    if (!addrSockets || addrSockets.size === 0) {
      return;
    }

    for (const socket of addrSockets) {
      this._safeSend(socket, message);
    }
  }

  /** Send to this instance's sockets in `roomId`. Skips closed sockets. */
  private _deliverToRoom(roomId: string, message: string): void {
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

  /**
   * Whether `address` still has at least one open socket on this instance.
   *
   * `unregister` drops the address bucket once it empties, so the key's
   * presence is the answer.
   *
   * ponytail: this instance only. A second tab parked on another instance
   * reads as gone here; make presence per-instance (`presence:{addr}:{id}`)
   * if the API ever runs multi-instance for real.
   */
  hasConnection(address: Address): boolean {
    return this.byAddress.has(address);
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

/**
 * Subscribe this instance to the fanout channel.
 *
 * A subscribed ioredis connection cannot run other commands, so this needs a
 * connection of its own — `duplicate()` reuses the singleton's config.
 * Started on import: an instance must be listening before its first socket
 * connects, not after its first send.
 */
function startFanoutSubscriber(): void {
  const subscriber = redis.duplicate();

  subscriber.on("error", (error) => {
    logger.error({ error }, "WS: fanout subscriber error");
  });

  subscriber.on("message", (channel, raw) => {
    if (channel === FANOUT_CHANNEL) {
      connectionManager.receiveFanout(raw);
    }
  });

  subscriber.subscribe(FANOUT_CHANNEL).then(
    () => logger.info("WS: fanout subscriber ready"),
    (error: unknown) =>
      logger.error(
        { error },
        "WS: fanout subscribe failed — single-instance delivery only",
      ),
  );
}

startFanoutSubscriber();
