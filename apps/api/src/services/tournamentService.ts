/**
 * Tournament Service — Task 4.10
 *
 * Handles bracket generation, round advancement, and on-chain finalization
 * for Swiss and single-elimination tournaments.
 *
 * Pairing metadata (p1/p2 per match) is stored in Redis since TournamentMatch
 * has no player fields — battles are created by players themselves.
 *
 * Redis key for pairings:
 *   `tournament:{tournamentId}:round:{round}:pairs`
 *   Value: JSON array of PairingEntry[]
 */

import { ARBITRUM_SEPOLIA_CHAIN_ID, getAddresses } from "@shardveil/contracts";

import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { redis } from "../config/redis";
import { publicClient, tournamentOracleWallet } from "../config/viem";
import * as notificationService from "./notificationService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One pairing entry stored in Redis for a round. */
export interface PairingEntry {
  p1: string; // player address
  p2: string; // player address
  matchId: string; // TournamentMatch.id
  matchIndex: number; // 0-based index within the round
}

// ---------------------------------------------------------------------------
// Stub ABI for TournamentEngine.finalizeTournament
// Real ABI not yet deployed — kept minimal for simulateContract / writeContract.
// ---------------------------------------------------------------------------

const tournamentEngineAbi = [
  {
    name: "finalizeTournament",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tournamentId", type: "string" }],
    outputs: [],
  },
] as const;

// ---------------------------------------------------------------------------
// Redis helpers
// ---------------------------------------------------------------------------

function pairingKey(tournamentId: string, round: number): string {
  return `tournament:${tournamentId}:round:${round}:pairs`;
}

async function storePairings(
  tournamentId: string,
  round: number,
  pairs: PairingEntry[],
): Promise<void> {
  const key = pairingKey(tournamentId, round);
  // TTL: 7 days — long enough for any tournament to complete
  await redis.set(key, JSON.stringify(pairs), "EX", 7 * 24 * 60 * 60);
}

async function loadPairings(
  tournamentId: string,
  round: number,
): Promise<PairingEntry[]> {
  const key = pairingKey(tournamentId, round);
  const raw = await redis.get(key);
  if (!raw) return [];
  return JSON.parse(raw) as PairingEntry[];
}

// ---------------------------------------------------------------------------
// Shuffle helper (Fisher-Yates)
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ---------------------------------------------------------------------------
// generateBracket
// ---------------------------------------------------------------------------

/**
 * Generate initial bracket (round 1) for a tournament.
 *
 * - SINGLE_ELIM: shuffle all registered players, pair sequentially.
 * - SWISS: first round is also a shuffle; subsequent rounds sort by wins desc.
 *
 * Creates TournamentMatch rows in DB (battleId = null initially).
 * Stores pairing metadata (p1/p2/matchId) in Redis.
 * Notifies each paired player via notificationService.
 * Updates Tournament.status to ACTIVE.
 */
async function generateBracket(tournamentId: string): Promise<void> {
  logger.info({ tournamentId }, "tournamentService: generateBracket start");

  // 1. Load tournament with players
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
    include: { players: true },
  });

  const playerAddresses = tournament.players.map((p) => p.playerAddress);

  if (playerAddresses.length < 2) {
    throw new Error(
      `Tournament ${tournamentId} has fewer than 2 registered players`,
    );
  }

  // 2. Determine pairing order
  // Both SWISS round-1 and SINGLE_ELIM start with a shuffle
  const ordered = shuffle(playerAddresses);

  // Pair adjacent players (drop last if odd number)
  const pairs: Array<{ p1: string; p2: string }> = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    pairs.push({ p1: ordered[i]!, p2: ordered[i + 1]! });
  }

  // 3. Create TournamentMatch rows
  const round = 1;
  const created = await prisma.$transaction(
    pairs.map(() =>
      prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round,
          battleId: null,
        },
      }),
    ),
  );

  // 4. Store pairing metadata in Redis
  const pairingEntries: PairingEntry[] = created.map((match, idx) => ({
    p1: pairs[idx]!.p1,
    p2: pairs[idx]!.p2,
    matchId: match.id,
    matchIndex: idx,
  }));
  await storePairings(tournamentId, round, pairingEntries);

  // 5. Notify each paired player
  await Promise.allSettled(
    pairingEntries.flatMap(({ p1, p2, matchId, matchIndex }) => [
      notificationService.create(p1 as `0x${string}`, "SYSTEM", {
        event: "TOURNAMENT_MATCH_ASSIGNED",
        tournamentId,
        round,
        matchId,
        opponent: p2,
        matchIndex,
      }),
      notificationService.create(p2 as `0x${string}`, "SYSTEM", {
        event: "TOURNAMENT_MATCH_ASSIGNED",
        tournamentId,
        round,
        matchId,
        opponent: p1,
        matchIndex,
      }),
    ]),
  );

  // 6. Update tournament status to ACTIVE
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "ACTIVE",
      startedAt: tournament.startedAt ?? new Date(),
    },
  });

  logger.info(
    { tournamentId, round, matchCount: pairs.length },
    "tournamentService: bracket generated",
  );
}

// ---------------------------------------------------------------------------
// advanceRound
// ---------------------------------------------------------------------------

/**
 * Check if all matches in the current round are settled.
 * If yes, collect winners and either finalize or create the next round.
 *
 * Current round = max round from existing TournamentMatch rows.
 */
async function advanceRound(tournamentId: string): Promise<void> {
  logger.info({ tournamentId }, "tournamentService: advanceRound start");

  // 1. Determine current round
  const aggregate = await prisma.tournamentMatch.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  const currentRound = aggregate._max.round;
  if (currentRound === null) {
    throw new Error(
      `Tournament ${tournamentId} has no matches — run generateBracket first`,
    );
  }

  // 2. Load all matches for the current round (with battles)
  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, round: currentRound },
    include: { battle: true },
  });

  // 3. Check if all matches are settled
  const allSettled = matches.every(
    (m) => m.battle !== null && m.battle.settledAt !== null,
  );

  if (!allSettled) {
    logger.info(
      { tournamentId, round: currentRound, totalMatches: matches.length },
      "tournamentService: round not yet complete — waiting",
    );
    return;
  }

  // 4. Collect winners
  const winners: string[] = [];
  for (const match of matches) {
    if (!match.battle?.winner) {
      logger.warn(
        { tournamentId, matchId: match.id },
        "tournamentService: settled battle has no winner — skipping match",
      );
      continue;
    }
    winners.push(match.battle.winner);
  }

  if (winners.length === 0) {
    throw new Error(
      `Tournament ${tournamentId}: no winners in round ${currentRound}`,
    );
  }

  // 5. If only 1 winner → finalize
  if (winners.length === 1) {
    logger.info(
      { tournamentId, winner: winners[0] },
      "tournamentService: final round complete — finalizing",
    );
    await finalizeTournament(tournamentId);
    return;
  }

  // 6. Load tournament to determine format
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
  });

  // 7. Order winners for next-round pairing
  let ordered: string[];
  if (tournament.format === "SWISS") {
    // Sort by win count desc (count wins from all rounds so far)
    const winCounts = await getWinCounts(tournamentId, winners);
    ordered = [...winners].sort(
      (a, b) => (winCounts.get(b) ?? 0) - (winCounts.get(a) ?? 0),
    );
  } else {
    // SINGLE_ELIM: preserve current order (bracket order)
    ordered = winners;
  }

  // Pair adjacent
  const pairs: Array<{ p1: string; p2: string }> = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    pairs.push({ p1: ordered[i]!, p2: ordered[i + 1]! });
  }

  const nextRound = currentRound + 1;

  // 8. Create next-round TournamentMatch rows
  const created = await prisma.$transaction(
    pairs.map(() =>
      prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round: nextRound,
          battleId: null,
        },
      }),
    ),
  );

  // 9. Store pairing metadata in Redis
  const pairingEntries: PairingEntry[] = created.map((match, idx) => ({
    p1: pairs[idx]!.p1,
    p2: pairs[idx]!.p2,
    matchId: match.id,
    matchIndex: idx,
  }));
  await storePairings(tournamentId, nextRound, pairingEntries);

  // 10. Notify paired players
  await Promise.allSettled(
    pairingEntries.flatMap(({ p1, p2, matchId, matchIndex }) => [
      notificationService.create(p1 as `0x${string}`, "SYSTEM", {
        event: "TOURNAMENT_MATCH_ASSIGNED",
        tournamentId,
        round: nextRound,
        matchId,
        opponent: p2,
        matchIndex,
      }),
      notificationService.create(p2 as `0x${string}`, "SYSTEM", {
        event: "TOURNAMENT_MATCH_ASSIGNED",
        tournamentId,
        round: nextRound,
        matchId,
        opponent: p1,
        matchIndex,
      }),
    ]),
  );

  logger.info(
    { tournamentId, nextRound, matchCount: pairs.length },
    "tournamentService: next round created",
  );
}

// ---------------------------------------------------------------------------
// finalizeTournament
// ---------------------------------------------------------------------------

/**
 * Mark a tournament as COMPLETED and (optionally) call on-chain finalizeTournament.
 *
 * On-chain call is skipped if tournamentEngine address is not available
 * (contract not yet deployed).
 */
async function finalizeTournament(tournamentId: string): Promise<void> {
  logger.info({ tournamentId }, "tournamentService: finalizeTournament start");

  // 1. Load tournament
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
  });

  // 2. Determine winner from last round's battle
  const aggregate = await prisma.tournamentMatch.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  const lastRound = aggregate._max.round;

  let finalWinner: string | null = null;
  if (lastRound !== null) {
    const lastMatches = await prisma.tournamentMatch.findMany({
      where: { tournamentId, round: lastRound },
      include: { battle: true },
    });
    // Pick the winner from the final match (should be exactly 1 after advanceRound gates)
    for (const m of lastMatches) {
      if (m.battle?.winner) {
        finalWinner = m.battle.winner;
        break;
      }
    }
  }

  logger.info(
    { tournamentId, finalWinner, lastRound },
    "tournamentService: determined final winner",
  );

  // 3. Attempt on-chain finalization
  const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
  // tournamentEngine is not in the addresses map yet — guard gracefully
  const tournamentEngineAddress = (addresses as Record<string, string | null>)[
    "tournamentEngine"
  ] as `0x${string}` | null | undefined;

  if (tournamentEngineAddress) {
    try {
      const wallet = tournamentOracleWallet();
      const { request } = await publicClient.simulateContract({
        address: tournamentEngineAddress,
        abi: tournamentEngineAbi,
        functionName: "finalizeTournament",
        args: [tournamentId],
        account: wallet.account,
      });
      const txHash = await wallet.writeContract(request);
      logger.info(
        { tournamentId, txHash },
        "tournamentService: on-chain finalizeTournament submitted",
      );
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      logger.info(
        { tournamentId, txHash },
        "tournamentService: on-chain finalizeTournament confirmed",
      );
    } catch (err) {
      logger.error(
        {
          tournamentId,
          error: err instanceof Error ? err.message : String(err),
        },
        "tournamentService: on-chain finalizeTournament failed — continuing with DB update",
      );
      // Non-fatal: we still complete the tournament in the DB
    }
  } else {
    logger.warn(
      { tournamentId },
      "tournamentService: tournamentEngine contract address not available — skipping on-chain call",
    );
  }

  // 4. Update tournament status
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  // 5. Notify winner with ACHIEVEMENT notification
  if (finalWinner) {
    await notificationService.create(
      finalWinner as `0x${string}`,
      "ACHIEVEMENT",
      {
        event: "TOURNAMENT_WON",
        tournamentId,
        tournamentName: tournament.name,
        prizePool: tournament.prizePool ?? null,
      },
    );
  }

  logger.info(
    { tournamentId, finalWinner },
    "tournamentService: tournament finalized",
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Count wins for each player in the given set across all rounds of a tournament.
 * Uses settled battles referenced by TournamentMatch.
 */
async function getWinCounts(
  tournamentId: string,
  players: string[],
): Promise<Map<string, number>> {
  const allMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: { battle: true },
  });

  const counts = new Map<string, number>(players.map((p) => [p, 0]));

  for (const match of allMatches) {
    if (match.battle?.winner) {
      const w = match.battle.winner;
      if (counts.has(w)) {
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Exported service object
// ---------------------------------------------------------------------------

export const tournamentService = {
  generateBracket,
  advanceRound,
  finalizeTournament,

  /** Expose pairing reads for external use (e.g. battle channel assigning matchId). */
  loadPairings,
};
