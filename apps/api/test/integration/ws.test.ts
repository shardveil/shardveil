/**
 * Integration tests for WS channel logic — Task 4.15
 *
 * Tests channel handlers directly without a live HTTP+WS server.
 * All external dependencies (Prisma, Redis, connectionManager) are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock external dependencies before any module import
// ---------------------------------------------------------------------------

// Mock connectionManager
vi.mock("../../src/ws/connectionManager", () => ({
  connectionManager: {
    sendToAddress: vi.fn(),
    sendToRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    refreshPresence: vi.fn(),
    getOnlineCount: vi.fn().mockReturnValue(0),
    getAddressCount: vi.fn().mockReturnValue(0),
  },
}));

// Mock database
vi.mock("../../src/config/database", () => ({
  prisma: {
    directMessage: {
      create: vi.fn(),
    },
    guildMessage: {
      create: vi.fn(),
    },
    globalChatMessage: {
      create: vi.fn(),
    },
    guildMember: {
      findUnique: vi.fn(),
    },
    friend: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Mock Redis
vi.mock("../../src/config/redis", () => ({
  redis: {
    multi: vi.fn().mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 1],
        [null, 1],
      ]),
    }),
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    decrby: vi.fn().mockResolvedValue(0),
    mget: vi.fn().mockResolvedValue([]),
  },
}));

// Mock moderation service
vi.mock("../../src/services/moderationService", () => ({
  filterContent: vi
    .fn()
    .mockImplementation((text: string) =>
      Promise.resolve({ clean: text, flagged: false }),
    ),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { prisma } from "../../src/config/database";
import { redis } from "../../src/config/redis";
import * as notificationService from "../../src/services/notificationService";
import { connectionManager } from "../../src/ws/connectionManager";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

type Socket = WSContext<WebSocket>;

/** Build a minimal mock socket that captures sent messages. */
function makeMockSocket(): Socket & { _sent: string[] } {
  const sent: string[] = [];
  return {
    readyState: 1, // WS_OPEN
    send: vi.fn((msg: string) => {
      sent.push(msg);
    }),
    close: vi.fn(),
    _sent: sent,
  } as unknown as Socket & { _sent: string[] };
}

const SENDER = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const RECEIVER = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;

// ---------------------------------------------------------------------------
// ChatChannel — handleSend for DM
// ---------------------------------------------------------------------------

describe("ChatChannel — SEND DM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate-limit mock to allow (count = 1 means first message, allowed)
    vi.mocked(redis.multi).mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 1],
        [null, 1],
      ]),
    } as ReturnType<typeof redis.multi>);
  });

  it("SEND DM creates DirectMessage record and delivers to room", async () => {
    // Lazy import to pick up the mocks
    const { messageRouter } = await import("../../src/ws/messageRouter");
    const { registerChatChannel } =
      await import("../../src/ws/channels/chatChannel");

    // Register chat channel (idempotent in tests via module cache)
    registerChatChannel();

    const mockCreate = vi
      .mocked(prisma.directMessage.create)
      .mockResolvedValueOnce({
        id: "dm-1",
        senderId: SENDER,
        receiverId: RECEIVER,
        content: "hello",
        isModerated: false,
        createdAt: new Date(),
      } as Awaited<ReturnType<typeof prisma.directMessage.create>>);

    const socket = makeMockSocket();
    const dmRoom = [SENDER, RECEIVER].sort().join(":");
    const roomId = `dm:${dmRoom.split(":")[0]}:${dmRoom.split(":")[1]}`;

    await messageRouter.route(
      socket,
      SENDER,
      JSON.stringify({
        channel: "chat",
        type: "SEND",
        payload: { roomId, text: "hello" },
      }),
    );

    // DirectMessage row created
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: SENDER,
          content: "hello",
        }),
      }),
    );

    // Broadcast to room
    expect(vi.mocked(connectionManager.sendToRoom)).toHaveBeenCalledOnce();
    expect(vi.mocked(connectionManager.sendToRoom)).toHaveBeenCalledWith(
      roomId,
      expect.stringContaining('"type":"MESSAGE"'),
    );
  });

  it("SEND DM is rate-limited on second message within window", async () => {
    const { messageRouter } = await import("../../src/ws/messageRouter");

    // Simulate rate limit exceeded (count > 1)
    vi.mocked(redis.multi).mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, 2],
        [null, 1],
      ]),
    } as ReturnType<typeof redis.multi>);

    const socket = makeMockSocket();
    const roomId = `dm:${[SENDER, RECEIVER].sort().join(":")}`;

    await messageRouter.route(
      socket,
      SENDER,
      JSON.stringify({
        channel: "chat",
        type: "SEND",
        payload: { roomId, text: "second message" },
      }),
    );

    // Should NOT create DB record
    expect(vi.mocked(prisma.directMessage.create)).not.toHaveBeenCalled();

    // Sender receives MUTED message
    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"MUTED"'),
    );
  });

  it("SEND to global room persists as GlobalChatMessage", async () => {
    const { messageRouter } = await import("../../src/ws/messageRouter");

    vi.mocked(prisma.globalChatMessage.create).mockResolvedValueOnce({
      id: "gcm-1",
      room: "#general",
      senderAddress: SENDER,
      content: "hey all",
      isModerated: false,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.globalChatMessage.create>>);

    const socket = makeMockSocket();

    await messageRouter.route(
      socket,
      SENDER,
      JSON.stringify({
        channel: "chat",
        type: "SEND",
        payload: { roomId: "#general", text: "hey all" },
      }),
    );

    expect(vi.mocked(prisma.globalChatMessage.create)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.globalChatMessage.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          room: "#general",
          senderAddress: SENDER,
          content: "hey all",
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// NotificationService — create + WS push
// ---------------------------------------------------------------------------

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates notification and pushes WS when recipient is online", async () => {
    const mockNotification = {
      id: "notif-1",
      playerAddress: RECEIVER,
      type: "SYSTEM" as const,
      data: {
        contractName: "packContract",
        eventName: "PackFulfilled",
        txHash: "0xabc",
      },
      readAt: null,
      createdAt: new Date(),
    };

    vi.mocked(prisma.notification.create).mockResolvedValueOnce(
      mockNotification as Awaited<
        ReturnType<typeof prisma.notification.create>
      >,
    );

    // Simulate recipient online — sendToAddress called
    vi.mocked(connectionManager.sendToAddress).mockImplementation(() => {
      // no-op — recipient is "online"
    });

    const result = await notificationService.create(RECEIVER, "SYSTEM", {
      contractName: "packContract",
      eventName: "PackFulfilled",
      txHash: "0xabc",
    });

    expect(result).toMatchObject({ id: "notif-1", playerAddress: RECEIVER });

    // DB write happened
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledOnce();

    // WS push attempted (no way to distinguish online vs offline from API,
    // sendToAddress is always called and is a no-op if offline)
    expect(vi.mocked(connectionManager.sendToAddress)).toHaveBeenCalledWith(
      RECEIVER,
      expect.stringContaining('"type":"NEW"'),
    );
  });

  it("creates notification in DB even when WS push throws", async () => {
    const mockNotification = {
      id: "notif-2",
      playerAddress: RECEIVER,
      type: "SYSTEM" as const,
      data: {},
      readAt: null,
      createdAt: new Date(),
    };

    vi.mocked(prisma.notification.create).mockResolvedValueOnce(
      mockNotification as Awaited<
        ReturnType<typeof prisma.notification.create>
      >,
    );

    // Simulate WS push failure
    vi.mocked(connectionManager.sendToAddress).mockImplementationOnce(() => {
      throw new Error("socket closed");
    });

    // Should NOT throw — WS failure is swallowed
    const result = await notificationService.create(RECEIVER, "SYSTEM", {});
    expect(result.id).toBe("notif-2");

    // DB record still created
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// NotificationChannel — SUBSCRIBE handler
// ---------------------------------------------------------------------------

describe("NotificationChannel — SUBSCRIBE", () => {
  it("SUBSCRIBE sends SUBSCRIBED acknowledgement", async () => {
    const { messageRouter } = await import("../../src/ws/messageRouter");
    const { registerNotificationChannel } =
      await import("../../src/ws/channels/notificationChannel");

    registerNotificationChannel();

    const socket = makeMockSocket();

    await messageRouter.route(
      socket,
      SENDER,
      JSON.stringify({
        channel: "notification",
        type: "SUBSCRIBE",
        payload: {},
      }),
    );

    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"SUBSCRIBED"'),
    );
  });
});
