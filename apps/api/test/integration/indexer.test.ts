/**
 * Integration tests for IndexerService — Task 4.15
 *
 * Tests indexerService.recordEvent directly without DB or Redis connections.
 * All external dependencies are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

// Mock Prisma
vi.mock("../../src/config/database", () => ({
  prisma: {
    indexedEvent: {
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

// Mock Redis (notificationService accesses it)
vi.mock("../../src/config/redis", () => ({
  redis: {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    decrby: vi.fn().mockResolvedValue(0),
  },
}));

// Mock connectionManager (notificationService pushes via WS)
vi.mock("../../src/ws/connectionManager", () => ({
  connectionManager: {
    sendToAddress: vi.fn(),
  },
}));

// Mock activityService
vi.mock("../../src/services/activityService", () => ({
  activityService: {
    recordActivity: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from "../../src/config/database";
import { activityService } from "../../src/services/activityService";
import { indexerService } from "../../src/services/indexerService";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const BUYER = "0x1234567890123456789012345678901234567890" as `0x${string}`;

const BASE_PARAMS = {
  txHash:
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  logIndex: 0,
  contractName: "packContract",
  eventName: "PackFulfilled",
  blockNumber: 100n,
  data: { buyer: BUYER, requestId: "42", cardsReceived: 5 },
  affectedAddresses: [BUYER],
} as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IndexerService.recordEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates IndexedEvent row on first call and returns isNew=true", async () => {
    vi.mocked(prisma.indexedEvent.create).mockResolvedValueOnce({
      id: "event-1",
      txHash: BASE_PARAMS.txHash,
      logIndex: BASE_PARAMS.logIndex,
      contractName: BASE_PARAMS.contractName,
      eventName: BASE_PARAMS.eventName,
      blockNumber: BASE_PARAMS.blockNumber,
      data: BASE_PARAMS.data,
      status: "PENDING",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.indexedEvent.create>>);

    // notification.create needs to succeed
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: "notif-1",
      playerAddress: BUYER,
      type: "SYSTEM",
      data: {},
      readAt: null,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.notification.create>>);

    const result = await indexerService.recordEvent(BASE_PARAMS);

    expect(result).toEqual({ isNew: true });

    expect(vi.mocked(prisma.indexedEvent.create)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.indexedEvent.create)).toHaveBeenCalledWith({
      data: {
        txHash: BASE_PARAMS.txHash,
        logIndex: BASE_PARAMS.logIndex,
        contractName: BASE_PARAMS.contractName,
        eventName: BASE_PARAMS.eventName,
        blockNumber: BASE_PARAMS.blockNumber,
        data: BASE_PARAMS.data,
        status: "PENDING",
      },
    });
  });

  it("is idempotent on duplicate txHash+logIndex — returns isNew=false and skips side effects", async () => {
    // P2002 = Prisma unique constraint violation
    const prismaUniqueError = Object.assign(
      new Error("Unique constraint failed"),
      {
        code: "P2002",
      },
    );
    vi.mocked(prisma.indexedEvent.create).mockRejectedValueOnce(
      prismaUniqueError,
    );

    const result = await indexerService.recordEvent(BASE_PARAMS);

    expect(result).toEqual({ isNew: false });

    // No notifications or activity recorded for duplicates
    expect(vi.mocked(prisma.notification.create)).not.toHaveBeenCalled();
    expect(vi.mocked(activityService.recordActivity)).not.toHaveBeenCalled();
  });

  it("notifies all affectedAddresses on new event", async () => {
    const ADDR_B =
      "0x9999999999999999999999999999999999999999" as `0x${string}`;
    const twoAddressParams = {
      ...BASE_PARAMS,
      affectedAddresses: [BUYER, ADDR_B],
    };

    vi.mocked(prisma.indexedEvent.create).mockResolvedValueOnce({
      id: "event-2",
      txHash: twoAddressParams.txHash,
      logIndex: twoAddressParams.logIndex,
      contractName: twoAddressParams.contractName,
      eventName: twoAddressParams.eventName,
      blockNumber: twoAddressParams.blockNumber,
      data: twoAddressParams.data,
      status: "PENDING",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.indexedEvent.create>>);

    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: "notif-x",
      playerAddress: BUYER,
      type: "SYSTEM",
      data: {},
      readAt: null,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.notification.create>>);

    const result = await indexerService.recordEvent(twoAddressParams);

    expect(result).toEqual({ isNew: true });

    // One notification per affected address
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledTimes(2);

    // Each notification call includes event metadata
    for (const call of vi.mocked(prisma.notification.create).mock.calls) {
      expect(call[0]).toMatchObject({
        data: expect.objectContaining({
          type: "SYSTEM",
          data: expect.objectContaining({
            contractName: "packContract",
            eventName: "PackFulfilled",
          }),
        }),
      });
    }
  });

  it("records activity for the primary (first) affected address on new event", async () => {
    vi.mocked(prisma.indexedEvent.create).mockResolvedValueOnce({
      id: "event-3",
      txHash: BASE_PARAMS.txHash,
      logIndex: BASE_PARAMS.logIndex,
      contractName: BASE_PARAMS.contractName,
      eventName: BASE_PARAMS.eventName,
      blockNumber: BASE_PARAMS.blockNumber,
      data: BASE_PARAMS.data,
      status: "PENDING",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.indexedEvent.create>>);

    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: "notif-2",
      playerAddress: BUYER,
      type: "SYSTEM",
      data: {},
      readAt: null,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.notification.create>>);

    await indexerService.recordEvent(BASE_PARAMS);

    expect(vi.mocked(activityService.recordActivity)).toHaveBeenCalledOnce();
    expect(vi.mocked(activityService.recordActivity)).toHaveBeenCalledWith(
      BUYER,
      BASE_PARAMS.eventName,
      BASE_PARAMS.data,
    );
  });

  it("does not notify or record activity when affectedAddresses is empty", async () => {
    const noAddressParams = { ...BASE_PARAMS, affectedAddresses: [] };

    vi.mocked(prisma.indexedEvent.create).mockResolvedValueOnce({
      id: "event-4",
      txHash: noAddressParams.txHash,
      logIndex: noAddressParams.logIndex,
      contractName: noAddressParams.contractName,
      eventName: noAddressParams.eventName,
      blockNumber: noAddressParams.blockNumber,
      data: noAddressParams.data,
      status: "PENDING",
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof prisma.indexedEvent.create>>);

    const result = await indexerService.recordEvent(noAddressParams);

    expect(result).toEqual({ isNew: true });
    expect(vi.mocked(prisma.notification.create)).not.toHaveBeenCalled();
    expect(vi.mocked(activityService.recordActivity)).not.toHaveBeenCalled();
  });

  it("re-throws non-P2002 errors from indexedEvent.create", async () => {
    const unexpectedError = new Error("DB connection lost");
    vi.mocked(prisma.indexedEvent.create).mockRejectedValueOnce(
      unexpectedError,
    );

    await expect(indexerService.recordEvent(BASE_PARAMS)).rejects.toThrow(
      "DB connection lost",
    );
  });
});
