/**
 * Chat room membership.
 *
 * A DM room id carries both participants (`dm:<a>:<b>`), and nothing used to
 * check that the socket asking for it was one of them — so any authenticated
 * player could join a stranger's thread and read it, or send into it and have
 * the message stored as a DirectMessage from them.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { joinRoom, sendToRoom, guildMemberFindUnique, dmCreate } = vi.hoisted(
  () => ({
    joinRoom: vi.fn(),
    sendToRoom: vi.fn(),
    guildMemberFindUnique: vi.fn(),
    dmCreate: vi.fn(),
  }),
);

vi.mock("../src/ws/connectionManager", () => ({
  connectionManager: { joinRoom, sendToRoom, leaveRoom: vi.fn() },
}));

vi.mock("../src/config/database", () => ({
  prisma: {
    guildMember: { findUnique: guildMemberFindUnique },
    directMessage: { create: dmCreate },
    guildMessage: { create: vi.fn() },
    globalChatMessage: { create: vi.fn() },
  },
}));

vi.mock("../src/config/redis", () => ({
  redis: {
    // checkChatRateLimit: first reply is the INCR count
    multi: () => ({
      incr: function () {
        return this;
      },
      expire: function () {
        return this;
      },
      exec: () => Promise.resolve([[null, 1]]),
    }),
  },
}));

vi.mock("../src/services/moderationService", () => ({
  filterContent: vi.fn().mockResolvedValue({ clean: "hi", flagged: false }),
}));

import { messageRouter } from "../src/ws/messageRouter";

const { registerChatChannel } = await import("../src/ws/channels/chatChannel");
registerChatChannel();

const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const MALLORY = "0xcccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;

/** Alice and Bob's DM room, ids sorted the way the server builds them. */
const ALICE_BOB_DM = `dm:${ALICE}:${BOB}`;

function makeSocket() {
  return { readyState: 1, send: vi.fn(), close: vi.fn() };
}

/** Drive one chat message through the router as `address`. */
async function chat(
  socket: ReturnType<typeof makeSocket>,
  address: `0x${string}`,
  type: string,
  payload: unknown,
) {
  await messageRouter.route(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket as any,
    address,
    JSON.stringify({ channel: "chat", type, payload }),
  );
}

/** The last error code the socket was sent, or null. */
function lastErrorCode(socket: ReturnType<typeof makeSocket>): string | null {
  const calls = socket.send.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const parsed = JSON.parse(calls[i]![0] as string) as {
      error?: { code: string };
    };
    if (parsed.error) return parsed.error.code;
  }
  return null;
}

describe("chat room access", () => {
  beforeEach(() => {
    joinRoom.mockClear();
    sendToRoom.mockClear();
    dmCreate.mockClear().mockResolvedValue({});
    guildMemberFindUnique.mockReset().mockResolvedValue(null);
  });

  it("lets a participant join their own DM room", async () => {
    const socket = makeSocket();
    await chat(socket, ALICE, "JOIN_ROOM", { roomId: ALICE_BOB_DM });

    expect(joinRoom).toHaveBeenCalledWith(socket, ALICE_BOB_DM);
  });

  it("refuses a third party joining someone else's DM room", async () => {
    const socket = makeSocket();
    await chat(socket, MALLORY, "JOIN_ROOM", { roomId: ALICE_BOB_DM });

    expect(joinRoom).not.toHaveBeenCalled();
    expect(lastErrorCode(socket)).toBe("FORBIDDEN");
  });

  it("refuses a third party sending into someone else's DM room", async () => {
    const socket = makeSocket();
    await chat(socket, MALLORY, "SEND", { roomId: ALICE_BOB_DM, text: "hi" });

    expect(dmCreate).not.toHaveBeenCalled();
    expect(sendToRoom).not.toHaveBeenCalled();
    expect(lastErrorCode(socket)).toBe("FORBIDDEN");
  });

  it("refuses a third party typing into someone else's DM room", async () => {
    const socket = makeSocket();
    await chat(socket, MALLORY, "TYPING", {
      roomId: ALICE_BOB_DM,
      isTyping: true,
    });

    expect(sendToRoom).not.toHaveBeenCalled();
    expect(lastErrorCode(socket)).toBe("FORBIDDEN");
  });

  it("refuses a typing broadcast aimed at a non-chat room", async () => {
    const socket = makeSocket();
    await chat(socket, MALLORY, "TYPING", {
      roomId: "battle:match-1",
      isTyping: true,
    });

    expect(sendToRoom).not.toHaveBeenCalled();
    expect(lastErrorCode(socket)).toBe("INVALID_ROOM");
  });

  it("still refuses a guild room to a non-member", async () => {
    const socket = makeSocket();
    await chat(socket, MALLORY, "JOIN_ROOM", { roomId: "guild:g1" });

    expect(joinRoom).not.toHaveBeenCalled();
    expect(lastErrorCode(socket)).toBe("FORBIDDEN");
  });

  it("lets a guild member in", async () => {
    guildMemberFindUnique.mockResolvedValue({ id: "m1" });
    const socket = makeSocket();
    await chat(socket, MALLORY, "JOIN_ROOM", { roomId: "guild:g1" });

    expect(joinRoom).toHaveBeenCalledWith(socket, "guild:g1");
  });

  it("records the other participant as the DM receiver", async () => {
    const socket = makeSocket();
    await chat(socket, ALICE, "SEND", { roomId: ALICE_BOB_DM, text: "hi" });

    expect(dmCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senderId: ALICE, receiverId: BOB }),
      }),
    );
  });
});
