import type {
  CompletedRound,
  GameSettings,
  GameState,
  Player,
  RoundState,
  ScoringRules,
  ValidationResult,
} from '../types/game';

export type GameActionResult =
  | { success: true; state: GameState }
  | { success: false; error: string };

function ok(state: GameState): GameActionResult {
  return { success: true, state };
}

function fail(error: string): GameActionResult {
  return { success: false, error };
}

function buildPlayerIdsBySeat(players: Player[]): Record<number, string> {
  const bySeat: Record<number, string> = {};
  for (const player of players) {
    bySeat[player.seat] = player.id;
  }
  return bySeat;
}

export function getPlayerIdBySeat(players: Player[], seat: number): string | undefined {
  return players.find((p) => p.seat === seat)?.id;
}

/**
 * Builds the classic Oh Heck round sequence: hand sizes ramp from 1 up to the
 * largest hand and back down to 1, e.g. for 4 players: [1,2,...,9,8,...,1].
 */
export function buildRoundSequence(playerCount: number, maxCards?: number): number[] {
  if (playerCount < 2) {
    throw new Error('Oh Heck requires at least 2 players');
  }
  const max = maxCards ?? 13 - playerCount;
  if (max < 1) {
    throw new Error('Not enough cards for this many players');
  }
  const up: number[] = [];
  for (let n = 1; n <= max; n++) up.push(n);
  const down = up.slice(0, -1).reverse();
  return [...up, ...down];
}

export function getDealerSeat(roundIndex: number, playerCount: number): number {
  return roundIndex % playerCount;
}

/** Seats in bidding order for a round: starts left of the dealer, dealer bids last. */
export function getBidOrder(dealerSeat: number, playerCount: number): number[] {
  const order: number[] = [];
  for (let i = 1; i <= playerCount; i++) {
    order.push((dealerSeat + i) % playerCount);
  }
  return order;
}

export function createEmptyValues(playerIds: string[]): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const id of playerIds) values[id] = null;
  return values;
}

export function getNextBidSeat(
  bids: Record<string, number | null>,
  bidOrder: number[],
  playerIdsBySeat: Record<number, string>,
): number | null {
  for (const seat of bidOrder) {
    const playerId = playerIdsBySeat[seat];
    if (playerId !== undefined && bids[playerId] === null) return seat;
  }
  return null;
}

export function isValidBid(bid: number, cardsDealt: number): boolean {
  return Number.isInteger(bid) && bid >= 0 && bid <= cardsDealt;
}

export function validateBidSubmission(
  round: RoundState,
  players: Player[],
  playerId: string,
  bid: number,
): ValidationResult {
  const player = players.find((p) => p.id === playerId);
  if (!player) return { valid: false, error: 'Unknown player' };
  if (round.bidTurnSeat === null) {
    return { valid: false, error: 'Bidding is already complete for this round' };
  }
  if (player.seat !== round.bidTurnSeat) {
    return { valid: false, error: 'It is not this player\'s turn to bid' };
  }
  if (!isValidBid(bid, round.cardsDealt)) {
    return { valid: false, error: `Bid must be a whole number between 0 and ${round.cardsDealt}` };
  }
  // No "screw the dealer" constraint: the dealer bids freely like any other
  // player, so total bids may exceed (or fall short of) the tricks available.
  return { valid: true };
}

export function allSubmitted(values: Record<string, number | null>, playerIds: string[]): boolean {
  return playerIds.every((id) => values[id] !== null);
}

export function calculateRoundScore(bid: number, tricks: number, rules: ScoringRules): number {
  if (bid === tricks) return 10 + bid;
  return rules === 'trickBonus' ? tricks : 0;
}

export function validateTricks(
  tricks: Record<string, number | null>,
  cardsDealt: number,
  playerIds: string[],
): ValidationResult {
  let sum = 0;
  for (const id of playerIds) {
    const value = tricks[id];
    if (value === null || value === undefined) {
      return { valid: false, error: 'Every player needs a tricks-taken value' };
    }
    if (!Number.isInteger(value) || value < 0 || value > cardsDealt) {
      return { valid: false, error: `Tricks must be a whole number between 0 and ${cardsDealt}` };
    }
    sum += value;
  }
  if (sum !== cardsDealt) {
    return { valid: false, error: `Tricks taken must add up to ${cardsDealt} (got ${sum})` };
  }
  return { valid: true };
}

/** Running totals per player from completed rounds (sum of each round's scores). */
export function grandTotalsFromHistory(
  roundHistory: CompletedRound[],
  playerIds: string[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of playerIds) totals[id] = 0;
  for (const round of roundHistory) {
    for (const id of playerIds) {
      totals[id] += round.roundScores[id] ?? 0;
    }
  }
  return totals;
}

export function applyRoundScores(
  players: Player[],
  bids: Record<string, number>,
  tricks: Record<string, number>,
  rules: ScoringRules,
): { players: Player[]; roundScores: Record<string, number> } {
  const roundScores: Record<string, number> = {};
  const updatedPlayers = players.map((player) => {
    const score = calculateRoundScore(bids[player.id], tricks[player.id], rules);
    roundScores[player.id] = score;
    return { ...player, totalScore: player.totalScore + score };
  });
  return { players: updatedPlayers, roundScores };
}

export function createRound(
  roundIndex: number,
  players: Player[],
  roundSequence: number[],
): RoundState {
  const playerCount = players.length;
  const dealerSeat = getDealerSeat(roundIndex, playerCount);
  const bidOrder = getBidOrder(dealerSeat, playerCount);
  const playerIds = players.map((p) => p.id);
  return {
    number: roundIndex,
    cardsDealt: roundSequence[roundIndex],
    dealerSeat,
    bidOrder,
    bids: createEmptyValues(playerIds),
    tricks: createEmptyValues(playerIds),
    bidTurnSeat: bidOrder[0],
  };
}

export function startGame(settings: GameSettings, players: Player[]): GameActionResult {
  if (players.length !== settings.playerCount) {
    return fail(`Expected ${settings.playerCount} players but got ${players.length}`);
  }
  const roundSequence = buildRoundSequence(settings.playerCount, settings.maxCards);
  const currentRound = createRound(0, players, roundSequence);
  return ok({
    status: 'bidding',
    settings,
    players,
    roundSequence,
    currentRound,
    roundHistory: [],
  });
}

export function submitBid(state: GameState, playerId: string, bid: number): GameActionResult {
  if (state.status !== 'bidding' || !state.currentRound) {
    return fail('Game is not in the bidding phase');
  }
  const validation = validateBidSubmission(state.currentRound, state.players, playerId, bid);
  if (!validation.valid) return fail(validation.error ?? 'Invalid bid');

  const round = state.currentRound;
  const newBids = { ...round.bids, [playerId]: bid };
  const playerIdsBySeat = buildPlayerIdsBySeat(state.players);
  const bidTurnSeat = getNextBidSeat(newBids, round.bidOrder, playerIdsBySeat);
  return ok({
    ...state,
    currentRound: { ...round, bids: newBids, bidTurnSeat },
  });
}

export function finalizeBidding(state: GameState): GameActionResult {
  if (state.status !== 'bidding' || !state.currentRound) {
    return fail('Game is not in the bidding phase');
  }
  const playerIds = state.players.map((p) => p.id);
  if (!allSubmitted(state.currentRound.bids, playerIds)) {
    return fail('Not all players have submitted a bid yet');
  }
  return ok({ ...state, status: 'scoring' });
}

export function submitTricks(
  state: GameState,
  tricks: Record<string, number>,
): GameActionResult {
  if (state.status !== 'scoring' || !state.currentRound) {
    return fail('Game is not in the scoring phase');
  }
  const playerIds = state.players.map((p) => p.id);
  const validation = validateTricks(tricks, state.currentRound.cardsDealt, playerIds);
  if (!validation.valid) return fail(validation.error ?? 'Invalid tricks');
  return ok({
    ...state,
    currentRound: { ...state.currentRound, tricks },
  });
}

export function completeRound(state: GameState): GameActionResult {
  if (state.status !== 'scoring' || !state.currentRound) {
    return fail('Game is not in the scoring phase');
  }
  const round = state.currentRound;
  const playerIds = state.players.map((p) => p.id);
  const tricksValidation = validateTricks(round.tricks, round.cardsDealt, playerIds);
  if (!tricksValidation.valid) {
    return fail(tricksValidation.error ?? 'Tricks have not been recorded for this round');
  }

  const bidsFinal = round.bids as Record<string, number>;
  const tricksFinal = round.tricks as Record<string, number>;
  const { players: updatedPlayers, roundScores } = applyRoundScores(
    state.players,
    bidsFinal,
    tricksFinal,
    state.settings.scoringRules,
  );

  const completed: CompletedRound = {
    number: round.number,
    cardsDealt: round.cardsDealt,
    dealerSeat: round.dealerSeat,
    bids: bidsFinal,
    tricks: tricksFinal,
    roundScores,
  };
  const roundHistory = [...state.roundHistory, completed];
  const nextRoundIndex = round.number + 1;

  if (nextRoundIndex >= state.roundSequence.length) {
    return ok({
      ...state,
      status: 'finished',
      players: updatedPlayers,
      currentRound: null,
      roundHistory,
    });
  }

  const nextRound = createRound(nextRoundIndex, updatedPlayers, state.roundSequence);
  return ok({
    ...state,
    status: 'bidding',
    players: updatedPlayers,
    currentRound: nextRound,
    roundHistory,
  });
}
