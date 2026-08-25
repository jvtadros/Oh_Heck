export type GameStatus = 'lobby' | 'bidding' | 'scoring' | 'finished';

/** standard: exact bid scores 10 + bid, miss scores 0.
 *  trickBonus: same as standard, but a miss still earns 1 point per trick taken. */
export type ScoringRules = 'standard' | 'trickBonus';

export interface Player {
  id: string;
  name: string;
  seat: number;
  totalScore: number;
}

export interface GameSettings {
  playerCount: number;
  scoringRules: ScoringRules;
  /** Override the largest hand size for the round sequence; defaults to 13 - playerCount. */
  maxCards?: number;
}

export interface RoundState {
  /** Zero-based index into the round sequence. */
  number: number;
  cardsDealt: number;
  dealerSeat: number;
  /** Seat order in which players bid this round (dealer bids last). */
  bidOrder: number[];
  bids: Record<string, number | null>;
  tricks: Record<string, number | null>;
  /** Seat of the player whose turn it is to bid, or null once bidding is complete. */
  bidTurnSeat: number | null;
}

export interface CompletedRound {
  number: number;
  cardsDealt: number;
  dealerSeat: number;
  bids: Record<string, number>;
  tricks: Record<string, number>;
  roundScores: Record<string, number>;
}

export interface GameState {
  status: GameStatus;
  settings: GameSettings;
  players: Player[];
  roundSequence: number[];
  currentRound: RoundState | null;
  roundHistory: CompletedRound[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
