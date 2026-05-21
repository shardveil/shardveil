/**
 * Battle Channel — Task 4.6
 *
 * WebSocket channel handling the in-match battle flow.
 *
 * Inbound message types:
 *   JOIN_MATCH       — join/create a battle
 *   REVEAL_DECK      — reveal committed deck (verifies keccak256 commit)
 *   SUBMIT_ACTION    — submit a turn action
 *   FORFEIT          — voluntarily forfeit the match
 *   SIGN_SETTLEMENT  — provide EIP-712 signature for on-chain settlement
 *
 * Outbound message types:
 *   OPPONENT_JOINED          — second player joined
 *   BOTH_REVEALED            — both decks have been revealed
 *   TURN_UPDATE              — new battle state after an action / skip
 *   MATCH_SETTLED            — match finished (winner, state)
 *   OPPONENT_DISCONNECTED    — opponent lost connection (reconnect grace started)
 *   RECONNECT_DEADLINE       — countdown until forfeit for disconnected player
 *
 * State is stored in Redis under `battle:{matchId}`.
 * Battle room id: `battle:{matchId}` (used with connectionManager.joinRoom / sendToRoom).
 *
 * Reconnect logic:
 *   On disconnect the channel marks state RECONNECT_PENDING (60 s).
 *   On re-join within 60 s the match resumes.
 *   On timeout the BullMQ reconnect job triggers forfeit.
 */

import type { BattleState } from "@shardveil/shared";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import { z } from "zod";

import { logger } from "../../config/logger";
import { battleTimerQueue } from "../../config/queue";
import { redis } from "../../config/redis";
import type { Address } from "../../config/viem";
import {
  forfeit,
  getBattleState,
  joinMatch,
  markReconnectPending,
  revealDeck,
  signSettlement,
  submitAction,
} from "../../services/battleService";
import { connectionManager } from "../connectionManager";
import type { WsEnvelope } from "../messageRouter";
import { messageRouter } from "../messageRouter";

type Socket = WSContext<WebSocket>;

// ---------------------------------------------------------------------------
// Reconnect grace period (seconds)
// ---------------------------------------------------------------------------

const RECONNECT_GRACE_SECONDS = 60;

// ---------------------------------------------------------------------------
// Zod payload schemas
// ---------------------------------------------------------------------------

const JoinMatchPayloadSchema = z.object({
  matchId: z.string().min(1),
});

const RevealDeckPayloadSchema = z.object({
  matchId: z.string().min(1),
  deckCommit: z.string().min(1),
  deckCards: z.array(z.string()).min(1),
});

const SubmitActionPayloadSchema = z.object({
  matchId: z.string().min(1),
  action: z.unknown(),
});

const ForfeitPayloadSchema = z.object({
  matchId: z.string().min(1),
});

const SignSettlementPayloadSchema = z.object({
  matchId: z.string().min(1),
  signature: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Outbound message builders
// ---------------------------------------------------------------------------

function buildOpponentJoinedMsg(state: BattleState): string {
  return JSON.stringify({
    channel: "battle",
    type: "OPPONENT_JOINED",
    payload: state,
  });
}

function buildBothRevealedMsg(matchId: string): string {
  return JSON.stringify({
    channel: "battle",
    type: "BOTH_REVEALED",
    payload: { matchId },
  });
}

function buildTurnUpdateMsg(state: BattleState): string {
  return JSON.stringify({
    channel: "battle",
    type: "TURN_UPDATE",
    payload: state,
  });
}

function buildMatchSettledMsg(state: BattleState): string {
  return JSON.stringify({
    channel: "battle",
    type: "MATCH_SETTLED",
    payload: state,
  });
}

function buildOpponentDisconnectedMsg(
  matchId: string,
  address: Address,
  deadlineAt: number,
): string {
  return JSON.stringify({
    channel: "battle",
    type: "OPPONENT_DISCONNECTED",
    payload: { matchId, address, deadlineAt },
  });
}

function buildReconnectDeadlineMsg(
  matchId: string,
  deadlineAt: number,
): string {
  return JSON.stringify({
    channel: "battle",
    type: "RECONNECT_DEADLINE",
    payload: { matchId, deadlineAt },
  });
}

function buildErrorMsg(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } });
}

function safeSend(socket: Socket, message: string): void {
  try {
    socket.send(message);
  } catch {
    // Socket already closed
  }
}

// ---------------------------------------------------------------------------
// Helper: deck reveal tracking key
// ---------------------------------------------------------------------------

function deckRevealedKey(matchId: string, address: Address): string {
  return `battle:deck:${matchId}:${address}`;
}

// ---------------------------------------------------------------------------
// Handler: JOIN_MATCH
// ---------------------------------------------------------------------------

async function handleJoinMatch(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = JoinMatchPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMsg("INVALID_PAYLOAD", "JOIN_MATCH requires matchId"),
    );
    return;
  }

  const { matchId } = parsed.data;
  const roomId = `battle:${matchId}`;

  const state = await joinMatch(matchId, address);

  // Track which battle this player is in (needed for disconnect logic)
  await setActiveBattle(address, matchId);

  // Subscribe this socket to the battle room
  connectionManager.joinRoom(socket, roomId);

  if (state.status === "WAITING") {
    // First player — just send them the initial state
    safeSend(socket, buildTurnUpdateMsg(state));
    logger.info(
      { matchId, address },
      "battle channel: player1 joined, waiting",
    );
    return;
  }

  // Second player joined (or reconnect) — broadcast to room
  connectionManager.sendToRoom(roomId, buildOpponentJoinedMsg(state));
  logger.info(
    { matchId, address },
    "battle channel: player2 joined, match active",
  );
}

// ---------------------------------------------------------------------------
// Handler: REVEAL_DECK
// ---------------------------------------------------------------------------

async function handleRevealDeck(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = RevealDeckPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMsg(
        "INVALID_PAYLOAD",
        "REVEAL_DECK requires matchId, deckCommit, and deckCards",
      ),
    );
    return;
  }

  const { matchId, deckCommit, deckCards } = parsed.data;

  await revealDeck(matchId, address, deckCommit, deckCards);

  // Check if both players have now revealed
  const state = await getBattleState(matchId);
  const otherAddress =
    (state.player1 as Address) === address
      ? (state.player2 as Address)
      : (state.player1 as Address);

  const otherDeck = await redis.get(deckRevealedKey(matchId, otherAddress));

  const roomId = `battle:${matchId}`;
  if (otherDeck) {
    connectionManager.sendToRoom(roomId, buildBothRevealedMsg(matchId));
    logger.info({ matchId }, "battle channel: both decks revealed");
  } else {
    // Acknowledge to sender only
    safeSend(
      socket,
      JSON.stringify({
        channel: "battle",
        type: "DECK_RECEIVED",
        payload: { matchId },
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Handler: SUBMIT_ACTION
// ---------------------------------------------------------------------------

async function handleSubmitAction(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = SubmitActionPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMsg(
        "INVALID_PAYLOAD",
        "SUBMIT_ACTION requires matchId and action",
      ),
    );
    return;
  }

  const { matchId, action } = parsed.data;

  const newState = await submitAction(matchId, address, action);

  const roomId = `battle:${matchId}`;
  if (newState.status === "FINISHED") {
    connectionManager.sendToRoom(roomId, buildMatchSettledMsg(newState));
  } else {
    connectionManager.sendToRoom(roomId, buildTurnUpdateMsg(newState));
  }
}

// ---------------------------------------------------------------------------
// Handler: FORFEIT
// ---------------------------------------------------------------------------

async function handleForfeit(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = ForfeitPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMsg("INVALID_PAYLOAD", "FORFEIT requires matchId"),
    );
    return;
  }

  const { matchId } = parsed.data;

  await forfeit(matchId, address, false);

  const roomId = `battle:${matchId}`;
  try {
    const state = await getBattleState(matchId);
    connectionManager.sendToRoom(roomId, buildMatchSettledMsg(state));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Handler: SIGN_SETTLEMENT
// ---------------------------------------------------------------------------

async function handleSignSettlement(
  socket: Socket,
  address: Address,
  payload: unknown,
): Promise<void> {
  const parsed = SignSettlementPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    safeSend(
      socket,
      buildErrorMsg(
        "INVALID_PAYLOAD",
        "SIGN_SETTLEMENT requires matchId and signature",
      ),
    );
    return;
  }

  const { matchId, signature } = parsed.data;

  await signSettlement(matchId, address, signature);

  safeSend(
    socket,
    JSON.stringify({
      channel: "battle",
      type: "SETTLEMENT_SIGNED",
      payload: { matchId },
    }),
  );
}

// ---------------------------------------------------------------------------
// Disconnect / reconnect helpers (exported for wsServer.ts)
// ---------------------------------------------------------------------------

/**
 * Called when a player's socket closes while they are in a battle.
 * Marks RECONNECT_PENDING and notifies the opponent.
 *
 * wsServer.ts should call this from onClose when it can determine the
 * player is in an active battle (via `battle:active:{address}` Redis key).
 */
export async function handleBattleDisconnect(address: Address): Promise<void> {
  // Look up active battle for this address
  const matchId = await redis.get(`battle:active:${address}`);
  if (!matchId) return;

  let state;
  try {
    state = await getBattleState(matchId);
  } catch {
    return;
  }

  if (state.status !== "ACTIVE") return;

  await markReconnectPending(matchId, address);

  const deadlineAt = Date.now() + RECONNECT_GRACE_SECONDS * 1000;

  // Enqueue a reconnect-timeout job
  await battleTimerQueue.add(
    "reconnect-timeout",
    { matchId, address, type: "reconnect" },
    {
      delay: RECONNECT_GRACE_SECONDS * 1000,
      jobId: `reconnect:${matchId}:${address}`,
    },
  );

  // Notify the opponent
  const roomId = `battle:${matchId}`;
  connectionManager.sendToRoom(
    roomId,
    buildOpponentDisconnectedMsg(matchId, address, deadlineAt),
  );

  // Notify the disconnecting player (all their other sockets, if any)
  connectionManager.sendToAddress(
    address,
    buildReconnectDeadlineMsg(matchId, deadlineAt),
  );

  logger.info(
    { matchId, address, deadlineAt },
    "battle channel: player disconnected, reconnect grace started",
  );
}

/**
 * Track which battle a player is currently in.
 * Called by JOIN_MATCH on success so disconnect logic can find the matchId.
 */
export async function setActiveBattle(
  address: Address,
  matchId: string,
): Promise<void> {
  // Store with no TTL — cleared on forfeit/settlement or on rejoin
  await redis.set(`battle:active:${address}`, matchId);
}

/**
 * Clear the active battle tracking key.
 */
export async function clearActiveBattle(address: Address): Promise<void> {
  await redis.del(`battle:active:${address}`);
}

// ---------------------------------------------------------------------------
// Channel handler dispatch
// ---------------------------------------------------------------------------

async function battleChannelHandler(
  socket: Socket,
  address: Address,
  message: WsEnvelope,
): Promise<void> {
  switch (message.type) {
    case "JOIN_MATCH":
      await handleJoinMatch(socket, address, message.payload);
      break;

    case "REVEAL_DECK":
      await handleRevealDeck(socket, address, message.payload);
      break;

    case "SUBMIT_ACTION":
      await handleSubmitAction(socket, address, message.payload);
      break;

    case "FORFEIT":
      await handleForfeit(socket, address, message.payload);
      break;

    case "SIGN_SETTLEMENT":
      await handleSignSettlement(socket, address, message.payload);
      break;

    default:
      safeSend(
        socket,
        buildErrorMsg(
          "UNKNOWN_TYPE",
          `Unknown battle message type: ${message.type}`,
        ),
      );
      logger.debug(
        { address, type: message.type },
        "battle channel: unknown message type",
      );
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the battle channel handler with the message router.
 * Call this once at application startup (from wsServer.ts).
 */
export function registerBattleChannel(): void {
  messageRouter.register("battle", battleChannelHandler);
  logger.info("battle channel registered");
}
