/**
 * Battle Service — Task 4.6
 *
 * Manages battle lifecycle in Redis under `battle:{matchId}` (JSON).
 *
 * Exposed methods:
 *   joinMatch(matchId, address)                             → BattleState
 *   revealDeck(matchId, address, deckCommit, deckCards)     → void  (verifies commit)
 *   submitAction(matchId, address, action)                  → BattleState
 *   forfeit(matchId, address)                               → void
 *   requestSettlement(matchId)                              → void
 *
 * State is stored as JSON at `battle:{matchId}`.
 * Deck reveals are stored at `battle:deck:{matchId}:{address}`.
 * Signature storage: `battle:sig:{matchId}:{address}`.
 * Forfeit strike count: `battle:forfeit:{matchId}:{address}`.
 */

import type { BattleState } from "@shardveil/shared";
import { keccak256, toHex } from "viem";

import { logger } from "../config/logger";
import { battleTimerQueue, settlementQueue } from "../config/queue";
import { redis } from "../config/redis";
import type { Address } from "../config/viem";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TURN_TIMEOUT_SECONDS = 60;
const RECONNECT_GRACE_SECONDS = 60;
const MAX_FORFEIT_STRIKES = 3;

// ---------------------------------------------------------------------------
// Redis key helpers
// ---------------------------------------------------------------------------

function battleKey(matchId: string): string {
  return `battle:${matchId}`;
}

function deckKey(matchId: string, address: Address): string {
  return `battle:deck:${matchId}:${address}`;
}

function sigKey(matchId: string, address: Address): string {
  return `battle:sig:${matchId}:${address}`;
}

function forfeitKey(matchId: string, address: Address): string {
  return `battle:forfeit:${matchId}:${address}`;
}

function reconnectKey(matchId: string, address: Address): string {
  return `battle:reconnect:${matchId}:${address}`;
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/**
 * Load battle state from Redis. Throws if not found.
 */
export async function getBattleState(matchId: string): Promise<BattleState> {
  const raw = await redis.get(battleKey(matchId));
  if (!raw) {
    throw new Error(`Battle not found: ${matchId}`);
  }
  return JSON.parse(raw) as BattleState;
}

/**
 * Persist battle state to Redis (no TTL — battles are long-lived).
 */
async function saveBattleState(state: BattleState): Promise<void> {
  await redis.set(battleKey(state.battleId), JSON.stringify(state));
}

/**
 * Stub game logic. Module 09 will replace this with real card resolution.
 * For now, just returns the current state unchanged.
 */
function applyAction(state: BattleState, _action: unknown): BattleState {
  // Advance the turn to the other player
  const next: BattleState = {
    ...state,
    turnNumber: state.turnNumber + 1,
    currentTurn:
      state.currentTurn === state.player1 ? state.player2 : state.player1,
    timeoutAt: Date.now() + TURN_TIMEOUT_SECONDS * 1000,
  };
  return next;
}

/**
 * Schedule a turn-timer job in BullMQ for the current turn.
 * The delay is (timeoutAt - now) ms.
 */
async function scheduleTurnTimer(state: BattleState): Promise<void> {
  const delayMs = Math.max(0, state.timeoutAt - Date.now());
  await battleTimerQueue.add(
    "turn-timeout",
    {
      matchId: state.battleId,
      address: state.currentTurn,
      turnNumber: state.turnNumber,
    },
    {
      delay: delayMs,
      jobId: `turn:${state.battleId}:${state.turnNumber}`,
      // Remove existing job if it exists (new turn replaces old)
      removeOnComplete: true,
    },
  );
  logger.debug(
    { matchId: state.battleId, turn: state.turnNumber, delayMs },
    "battle: turn timer scheduled",
  );
}

// ---------------------------------------------------------------------------
// joinMatch
// ---------------------------------------------------------------------------

/**
 * Join a match. If this is the first player, initialize the BattleState.
 * If the second player joins, transition to ACTIVE and schedule the first turn timer.
 * Returns the current BattleState.
 */
export async function joinMatch(
  matchId: string,
  address: Address,
): Promise<BattleState> {
  const existingRaw = await redis.get(battleKey(matchId));

  if (!existingRaw) {
    // First player — create initial state
    const state: BattleState = {
      battleId: matchId,
      player1: address,
      player2: "0x0000000000000000000000000000000000000000" as Address,
      currentTurn: address,
      player1Hp: 30,
      player2Hp: 30,
      turnNumber: 0,
      status: "WAITING",
      winner: null,
      startedAt: Date.now(),
      timeoutAt: Date.now() + TURN_TIMEOUT_SECONDS * 1000,
    };
    await saveBattleState(state);
    logger.info({ matchId, address }, "battle: player1 joined, state created");
    return state;
  }

  const state = JSON.parse(existingRaw) as BattleState;

  // Same player reconnecting — handle reconnect
  if (state.player1 === address || state.player2 === address) {
    // Clear reconnect pending flag if set
    await redis.del(reconnectKey(matchId, address));
    logger.info({ matchId, address }, "battle: player reconnected");
    return state;
  }

  if (state.status !== "WAITING") {
    throw new Error(`Match ${matchId} is not accepting new players`);
  }

  // Guard: prevent a player from joining their own match
  if (state.player1 === address) {
    throw new Error("Cannot join your own match");
  }

  // Second player joins
  const updated: BattleState = {
    ...state,
    player2: address,
    status: "ACTIVE",
    startedAt: Date.now(),
    timeoutAt: Date.now() + TURN_TIMEOUT_SECONDS * 1000,
  };
  await saveBattleState(updated);
  await scheduleTurnTimer(updated);

  logger.info({ matchId, address }, "battle: player2 joined, match ACTIVE");
  return updated;
}

// ---------------------------------------------------------------------------
// revealDeck
// ---------------------------------------------------------------------------

/**
 * Verify deck commitment and persist the revealed deck.
 *
 * Commit scheme: keccak256(JSON.stringify(deckCards))
 * The client must have committed with the same stringification.
 * Production (Module 09) should add salt support.
 */
export async function revealDeck(
  matchId: string,
  address: Address,
  deckCommit: string,
  deckCards: string[],
): Promise<void> {
  const state = await getBattleState(matchId);

  if (state.player1 !== address && state.player2 !== address) {
    throw new Error("Address is not a participant in this battle");
  }

  // Verify commit hash
  const computed = keccak256(toHex(JSON.stringify(deckCards)));
  if (computed !== deckCommit) {
    logger.warn(
      { matchId, address, computed, deckCommit },
      "battle: deck commit mismatch",
    );
    throw new Error(
      `Deck commit mismatch: expected ${deckCommit}, got ${computed}`,
    );
  }

  // Store revealed deck (JSON serialized)
  await redis.set(deckKey(matchId, address), JSON.stringify(deckCards));
  logger.info({ matchId, address }, "battle: deck revealed and verified");

  // Check if both players have revealed
  const otherAddress =
    state.player1 === address ? state.player2 : state.player1;
  const otherDeck = await redis.get(deckKey(matchId, otherAddress));

  if (otherDeck) {
    logger.info({ matchId }, "battle: both decks revealed");
  }
}

// ---------------------------------------------------------------------------
// submitAction
// ---------------------------------------------------------------------------

/**
 * Submit a turn action. Validates it is the player's turn, applies the action
 * (stub), saves the new state, and re-schedules the turn timer.
 */
export async function submitAction(
  matchId: string,
  address: Address,
  action: unknown,
): Promise<BattleState> {
  const state = await getBattleState(matchId);

  if (state.status !== "ACTIVE") {
    throw new Error(`Match ${matchId} is not active`);
  }

  if (state.currentTurn !== address) {
    throw new Error("It is not your turn");
  }

  // Apply game logic (stub)
  const newState = applyAction(state, action);
  await saveBattleState(newState);

  // Schedule timer for the next turn
  await scheduleTurnTimer(newState);

  logger.debug(
    { matchId, address, turnNumber: newState.turnNumber },
    "battle: action submitted",
  );
  return newState;
}

// ---------------------------------------------------------------------------
// forfeit
// ---------------------------------------------------------------------------

/**
 * Forfeit the match. If called from the turn timer (auto-forfeit), also
 * increments the strike count. After MAX_FORFEIT_STRIKES auto-forfeits,
 * the match is finalized with the opponent as winner.
 *
 * @param isAutoForfeit - true when triggered by the turn timer
 */
export async function forfeit(
  matchId: string,
  address: Address,
  isAutoForfeit = false,
): Promise<void> {
  const state = await getBattleState(matchId);

  if (state.status === "FINISHED") {
    return; // Already finished — idempotent
  }

  const opponent = state.player1 === address ? state.player2 : state.player1;

  if (isAutoForfeit) {
    // Increment strike counter
    const strikesStr = await redis.incr(forfeitKey(matchId, address));
    const strikes = strikesStr;

    logger.info({ matchId, address, strikes }, "battle: auto-forfeit strike");

    if (strikes < MAX_FORFEIT_STRIKES) {
      // Not yet at threshold — skip turn by advancing to opponent
      const skipped: BattleState = {
        ...state,
        turnNumber: state.turnNumber + 1,
        currentTurn: opponent,
        timeoutAt: Date.now() + TURN_TIMEOUT_SECONDS * 1000,
      };
      await saveBattleState(skipped);
      await scheduleTurnTimer(skipped);
      return;
    }
  }

  // Final forfeit → finish the match
  const finished: BattleState = {
    ...state,
    status: "FINISHED",
    winner: opponent,
    timeoutAt: Date.now(),
  };
  await saveBattleState(finished);

  logger.info(
    { matchId, address, winner: opponent, isAutoForfeit },
    "battle: match ended by forfeit",
  );
}

// ---------------------------------------------------------------------------
// requestSettlement
// ---------------------------------------------------------------------------

/**
 * Collect both player signatures for on-chain settlement.
 * Each player calls this with their own sig. When both are present,
 * enqueues a settlementSigner job.
 *
 * @param matchId
 * @param address  - Signer address
 * @param signature - EIP-712 signature over the settlement payload
 */
export async function signSettlement(
  matchId: string,
  address: Address,
  signature: string,
): Promise<void> {
  const state = await getBattleState(matchId);

  if (state.player1 !== address && state.player2 !== address) {
    throw new Error("Address is not a participant in this battle");
  }

  // Store signature
  await redis.set(sigKey(matchId, address), signature);
  logger.info({ matchId, address }, "battle: settlement signature stored");

  // Check if both signatures are present
  const otherAddress =
    state.player1 === address ? state.player2 : state.player1;
  const otherSig = await redis.get(sigKey(matchId, otherAddress));
  const thisSig = await redis.get(sigKey(matchId, address));

  if (otherSig && thisSig) {
    // Both signatures collected — enqueue settlement job
    await settlementQueue.add("settle-match", {
      matchId,
      player1: state.player1,
      player2: state.player2,
      winner: state.winner,
      sig1: state.player1 === address ? thisSig : otherSig,
      sig2: state.player2 === address ? thisSig : otherSig,
    });
    logger.info(
      { matchId },
      "battle: both signatures collected, settlement enqueued",
    );
  }
}

/**
 * Alias for requestSettlement (called by the channel).
 */
export async function requestSettlement(matchId: string): Promise<void> {
  // This variant is called without a specific signer — it checks whether
  // both sigs are already stored and if so enqueues the job.
  const state = await getBattleState(matchId);
  const sig1 = await redis.get(sigKey(matchId, state.player1 as Address));
  const sig2 = await redis.get(sigKey(matchId, state.player2 as Address));

  if (sig1 && sig2) {
    await settlementQueue.add("settle-match", {
      matchId,
      player1: state.player1,
      player2: state.player2,
      winner: state.winner,
      sig1,
      sig2,
    });
    logger.info({ matchId }, "battle: settlement requested — job enqueued");
  } else {
    logger.debug(
      { matchId },
      "battle: settlement requested but missing signatures",
    );
  }
}

// ---------------------------------------------------------------------------
// Reconnect helpers
// ---------------------------------------------------------------------------

/**
 * Mark a player as RECONNECT_PENDING with a 60 sec grace window.
 * The battle timer worker checks this flag; if the player does not reconnect
 * within 60 sec, it calls forfeit().
 */
export async function markReconnectPending(
  matchId: string,
  address: Address,
): Promise<void> {
  await redis.set(
    reconnectKey(matchId, address),
    Date.now().toString(),
    "EX",
    RECONNECT_GRACE_SECONDS,
  );
  logger.info({ matchId, address }, "battle: reconnect grace period started");
}

/**
 * Returns true if a reconnect pending flag exists for this player
 * (i.e., they disconnected but are within the grace window).
 */
export async function isReconnectPending(
  matchId: string,
  address: Address,
): Promise<boolean> {
  const val = await redis.get(reconnectKey(matchId, address));
  return val !== null;
}
