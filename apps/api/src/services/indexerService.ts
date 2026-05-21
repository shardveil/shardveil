/**
 * Indexer Service — Task 4.7
 *
 * Handles idempotent DB writes and downstream side-effects for each indexed
 * on-chain event.
 *
 * - recordEvent: upsert IndexedEvent by (txHash, logIndex), then fan-out
 *   notifications + activity for new events.
 * - confirmEvents: promote PENDING events older than 5 blocks to CONFIRMED.
 */

import type { Prisma } from "@prisma/client";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { activityService } from "./activityService";
import * as notificationService from "./notificationService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordEventParams {
  txHash: string;
  logIndex: number;
  contractName: string;
  eventName: string;
  blockNumber: bigint;
  data: object;
  /** Ethereum addresses to notify about this event */
  affectedAddresses?: string[];
}

export interface RecordEventResult {
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const indexerService = {
  /**
   * Idempotently record an on-chain event in the DB.
   *
   * Uses the (txHash, logIndex) unique constraint to deduplicate.
   * On first insert (isNew = true) fires notifications and records activity.
   */
  async recordEvent(params: RecordEventParams): Promise<RecordEventResult> {
    const {
      txHash,
      logIndex,
      contractName,
      eventName,
      blockNumber,
      data,
      affectedAddresses = [],
    } = params;

    let isNew = false;

    try {
      // Attempt to create — skip if the pair already exists.
      await prisma.indexedEvent.create({
        data: {
          txHash,
          logIndex,
          contractName,
          eventName,
          blockNumber,
          data: data as Prisma.InputJsonValue,
          status: "PENDING",
        },
      });
      isNew = true;
    } catch (err: unknown) {
      // P2002 = unique constraint violation — expected for duplicates
      const isPrismaUniqueError =
        err instanceof Error && (err as { code?: string }).code === "P2002";

      if (!isPrismaUniqueError) {
        // Re-throw unexpected errors
        throw err;
      }

      logger.debug(
        { txHash, logIndex, contractName, eventName },
        "indexer: duplicate event — skipping",
      );
    }

    if (isNew && affectedAddresses.length > 0) {
      // Fan-out notifications (fire-and-forget on individual failures)
      await Promise.allSettled(
        affectedAddresses.map((addr) =>
          notificationService.create(addr as `0x${string}`, "SYSTEM", {
            contractName,
            eventName,
            txHash,
          }),
        ),
      );

      // Record activity for the primary actor
      try {
        await activityService.recordActivity(
          affectedAddresses[0]!,
          eventName,
          data,
        );
      } catch (err) {
        logger.warn(
          {
            address: affectedAddresses[0],
            eventName,
            error: err instanceof Error ? err.message : String(err),
          },
          "indexer: activityService.recordActivity failed",
        );
      }
    }

    return { isNew };
  },

  /**
   * Confirm all PENDING events at or below `confirmedBlock - 5`.
   *
   * Should be called periodically (e.g. after each getLogs batch or on a
   * timer) to transition events from PENDING to CONFIRMED once they are
   * sufficiently deep in the chain.
   */
  async confirmEvents(confirmedBlock: bigint): Promise<void> {
    const threshold = confirmedBlock - 5n;
    if (threshold < 0n) return;

    const { count } = await prisma.indexedEvent.updateMany({
      where: {
        status: "PENDING",
        blockNumber: { lte: threshold },
      },
      data: { status: "CONFIRMED" },
    });

    if (count > 0) {
      logger.info(
        {
          confirmedBlock: confirmedBlock.toString(),
          threshold: threshold.toString(),
          count,
        },
        "indexer: confirmed events",
      );
    }
  },
};
