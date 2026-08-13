/**
 * Cross-instance WS fanout.
 *
 * Sockets live in one process, but presence lives in Redis — so a second API
 * instance would report a player online and drop every message aimed at them
 * unless sends are relayed. These tests pin the relay.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Redis before importing the module under test
// ---------------------------------------------------------------------------

// hoisted: vi.mock factories run before top-level consts are initialized
const { subscriberHandlers } = vi.hoisted(() => ({
  subscriberHandlers: new Map<string, (...args: unknown[]) => void>(),
}));

vi.mock("../src/config/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    duplicate: vi.fn(() => ({
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        subscriberHandlers.set(event, handler);
      }),
      subscribe: vi.fn().mockResolvedValue(1),
    })),
  },
}));

import { redis } from "../src/config/redis";
import { connectionManager } from "../src/ws/connectionManager";

const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const ROOM = "battle:match-1";

/** Minimal open socket that records what it was sent. */
function makeSocket() {
  return { readyState: 1, send: vi.fn(), close: vi.fn() };
}

/** Register a socket for ALICE and subscribe it to ROOM. */
function connectAlice() {
  const socket = makeSocket();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionManager.register(ALICE, socket as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectionManager.joinRoom(socket as any, ROOM);
  return socket;
}

/** The FanoutMessage the manager last published, parsed. */
function lastPublished() {
  const calls = vi.mocked(redis.publish).mock.calls;
  const [channel, raw] = calls[calls.length - 1] as [string, string];
  return { channel, msg: JSON.parse(raw) };
}

describe("connectionManager — cross-instance fanout", () => {
  beforeEach(() => {
    vi.mocked(redis.publish).mockClear();
  });

  it("publishes a room send so other instances can deliver it", () => {
    const socket = connectAlice();

    connectionManager.sendToRoom(ROOM, "hello-room");

    // Local socket still gets it directly — no Redis round-trip in the path
    expect(socket.send).toHaveBeenCalledWith("hello-room");

    const { channel, msg } = lastPublished();
    expect(channel).toBe("ws:fanout");
    expect(msg).toMatchObject({
      kind: "room",
      target: ROOM,
      payload: "hello-room",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("publishes an address send too", () => {
    const socket = connectAlice();

    connectionManager.sendToAddress(ALICE, "hello-alice");

    expect(socket.send).toHaveBeenCalledWith("hello-alice");
    expect(lastPublished().msg).toMatchObject({
      kind: "address",
      target: ALICE,
      payload: "hello-alice",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("delivers a message published by another instance", () => {
    const socket = connectAlice();

    connectionManager.receiveFanout(
      JSON.stringify({
        from: "some-other-instance",
        kind: "room",
        target: ROOM,
        payload: "from-elsewhere",
      }),
    );

    expect(socket.send).toHaveBeenCalledWith("from-elsewhere");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("drops its own echo instead of sending the message twice", () => {
    const socket = connectAlice();

    connectionManager.sendToRoom(ROOM, "only-once");
    expect(socket.send).toHaveBeenCalledTimes(1);

    // Redis loops the publish back to every subscriber, including us
    const { msg } = lastPublished();
    connectionManager.receiveFanout(JSON.stringify(msg));

    expect(socket.send).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("ignores a malformed fanout payload instead of throwing", () => {
    const socket = connectAlice();

    expect(() => connectionManager.receiveFanout("not json")).not.toThrow();
    expect(socket.send).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("still delivers locally when the fanout publish fails", () => {
    const socket = connectAlice();
    vi.mocked(redis.publish).mockRejectedValueOnce(new Error("redis down"));

    expect(() => connectionManager.sendToRoom(ROOM, "degraded")).not.toThrow();
    expect(socket.send).toHaveBeenCalledWith("degraded");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(socket as any);
  });

  it("subscribes to the fanout channel on import", () => {
    expect(vi.mocked(redis.duplicate)).toHaveBeenCalled();
    expect(subscriberHandlers.has("message")).toBe(true);
  });
});

describe("connectionManager — hasConnection", () => {
  // wsServer's onClose gates handleBattleDisconnect on this. Get it wrong and
  // closing a second tab forfeits the match still open in the first one.
  it("stays true while another socket for the address is open", () => {
    const first = connectAlice();
    const second = connectAlice();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(second as any);
    expect(connectionManager.hasConnection(ALICE)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectionManager.unregister(first as any);
    expect(connectionManager.hasConnection(ALICE)).toBe(false);
  });

  it("is false for an address that never connected", () => {
    expect(
      connectionManager.hasConnection(
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
      ),
    ).toBe(false);
  });
});
