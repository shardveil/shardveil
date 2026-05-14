/** Hex-prefixed Ethereum address */
export type Address = `0x${string}`;

/** Card rarity tiers */
export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

/** Player rank tiers */
export type BattleRank = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'APEX';

/** Pack purchase tiers */
export type PackTier = 'BASIC' | 'PREMIUM' | 'ELITE' | 'MYTHIC';

/** Tournament lifecycle states */
export type TournamentStatus = 'UPCOMING' | 'REGISTRATION' | 'ACTIVE' | 'FINISHED';

/** P2P trade offer states */
export type TradeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

/** Minted card data returned from pack opens */
export interface CardResult {
  cardId: bigint;
  rarity: CardRarity;
  name: string;
  imageUrl: string;
}

/** Live battle state shared between players and spectators */
export interface BattleState {
  battleId: string;
  player1: Address;
  player2: Address;
  currentTurn: Address;
  player1Hp: number;
  player2Hp: number;
  turnNumber: number;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  winner: Address | null;
  startedAt: number;
  timeoutAt: number;
}

/** Turn-based in-battle game state (refined in Module 09) */
export interface GameState {
  battleId: string;
  hand: CardResult[];
  field: CardResult[];
  opponentFieldSize: number;
  opponentHandSize: number;
  mana: number;
  maxMana: number;
}

/** WebSocket message discriminated union — covers all channels */
export type WsMessage =
  | { channel: 'battle'; type: 'state_update'; payload: BattleState }
  | { channel: 'battle'; type: 'turn_action'; payload: { battleId: string; action: string } }
  | { channel: 'battle'; type: 'game_over'; payload: { battleId: string; winner: Address } }
  | { channel: 'chat'; type: 'message'; payload: { roomId: string; sender: Address; text: string; ts: number } }
  | { channel: 'notification'; type: 'push'; payload: { id: string; title: string; body: string; ts: number } }
  | { channel: 'presence'; type: 'online'; payload: { address: Address } }
  | { channel: 'presence'; type: 'offline'; payload: { address: Address } };
