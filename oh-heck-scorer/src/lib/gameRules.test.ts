import { describe, expect, it } from 'vitest';
import type { GameSettings, GameState, Player } from '../types/game';
import {
  applyRoundScores,
  buildRoundSequence,
  calculateRoundScore,
  completeRound,
  grandTotalsFromHistory,
  finalizeBidding,
  getBidOrder,
  getDealerSeat,
  playersMissingTricks,
  startGame,
  submitBid,
  submitPlayerTricks,
  submitTricks,
  tricksClaimed,
  validateTricks,
  withUnreportedTricksAsZero,
} from './gameRules';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    seat: i,
    totalScore: 0,
  }));
}

function unwrap(result: { success: boolean; state?: GameState; error?: string }): GameState {
  if (!result.success || !result.state) {
    throw new Error(`Expected success, got error: ${result.error}`);
  }
  return result.state;
}

describe('buildRoundSequence', () => {
  it('ramps 1 up to 7 and back down to 1, giving 13 rounds', () => {
    expect(buildRoundSequence(4)).toEqual([1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('plays 13 rounds regardless of how many players are at the table', () => {
    for (const playerCount of [2, 3, 4, 5, 6, 7]) {
      expect(buildRoundSequence(playerCount)).toHaveLength(13);
    }
  });

  it('respects an explicit maxCards override', () => {
    expect(buildRoundSequence(4, 3)).toEqual([1, 2, 3, 2, 1]);
  });

  it('throws for fewer than 2 players', () => {
    expect(() => buildRoundSequence(1)).toThrow();
  });

  it('throws when the deck cannot deal the largest hand to everyone', () => {
    // 8 players would need 56 cards for a 7-card hand.
    expect(() => buildRoundSequence(8)).toThrow(/Not enough cards/);
  });
});

describe('dealer rotation', () => {
  it('rotates the dealer seat each round, wrapping around player count', () => {
    const seats = [0, 1, 2, 3, 4, 5, 6].map((round) => getDealerSeat(round, 4));
    expect(seats).toEqual([0, 1, 2, 3, 0, 1, 2]);
  });

  it('orders bids starting left of the dealer, with the dealer bidding last', () => {
    expect(getBidOrder(1, 4)).toEqual([2, 3, 0, 1]);
  });
});

describe('scoring', () => {
  it('awards 10 + bid for an exact bid under standard rules', () => {
    expect(calculateRoundScore(3, 3, 'standard')).toBe(13);
  });

  it('awards 0 for a missed bid under standard rules', () => {
    expect(calculateRoundScore(3, 2, 'standard')).toBe(0);
  });

  it('awards tricks taken as a consolation under trickBonus rules', () => {
    expect(calculateRoundScore(3, 2, 'trickBonus')).toBe(2);
  });

  it('applies scores across all players and accumulates totals', () => {
    const players = makePlayers(2).map((p) => ({ ...p, totalScore: 5 }));
    const { players: updated, roundScores } = applyRoundScores(
      players,
      { p0: 2, p1: 1 },
      { p0: 2, p1: 0 },
      'standard',
    );
    expect(roundScores).toEqual({ p0: 12, p1: 0 });
    expect(updated.map((p) => p.totalScore)).toEqual([17, 5]);
  });

  it('sums round scores into grand totals across history', () => {
    expect(
      grandTotalsFromHistory(
        [
          { number: 0, cardsDealt: 1, dealerSeat: 0, bids: { p0: 1, p1: 0 }, tricks: { p0: 1, p1: 0 }, roundScores: { p0: 11, p1: 10 } },
          { number: 1, cardsDealt: 2, dealerSeat: 1, bids: { p0: 1, p1: 1 }, tricks: { p0: 1, p1: 1 }, roundScores: { p0: 11, p1: 11 } },
        ],
        ['p0', 'p1'],
      ),
    ).toEqual({ p0: 22, p1: 21 });
  });
});

describe('validateTricks', () => {
  it('requires tricks taken to sum to the cards dealt', () => {
    const result = validateTricks({ p0: 2, p1: 2 }, 3, ['p0', 'p1']);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/add up to 3/);
  });

  it('passes when tricks sum matches cards dealt', () => {
    expect(validateTricks({ p0: 2, p1: 1 }, 3, ['p0', 'p1']).valid).toBe(true);
  });
});

describe('per-player trick reporting', () => {
  const settings: GameSettings = { playerCount: 3, scoringRules: 'standard', maxCards: 2 };

  function scoringState(): GameState {
    let state = unwrap(startGame(settings, makePlayers(3)));
    state = unwrap(submitBid(state, 'p1', 1));
    state = unwrap(submitBid(state, 'p2', 0));
    state = unwrap(submitBid(state, 'p0', 0));
    return unwrap(finalizeBidding(state));
  }

  it('records one player without requiring the others yet', () => {
    const state = unwrap(submitPlayerTricks(scoringState(), 'p1', 1));
    expect(state.currentRound?.tricks).toEqual({ p0: null, p1: 1, p2: null });
  });

  it('lets a player overwrite their own count before the round is submitted', () => {
    let state = unwrap(submitPlayerTricks(scoringState(), 'p1', 1));
    state = unwrap(submitPlayerTricks(state, 'p1', 0));
    expect(state.currentRound?.tricks.p1).toBe(0);
  });

  it('rejects a count above the cards dealt', () => {
    // Round 1 deals 1 card, so 2 tricks is impossible.
    expect(submitPlayerTricks(scoringState(), 'p1', 2).success).toBe(false);
  });

  it('rejects a player who is not in the game', () => {
    expect(submitPlayerTricks(scoringState(), 'nobody', 0).success).toBe(false);
  });

  it('rejects reporting outside the scoring phase', () => {
    const lobby = unwrap(startGame(settings, makePlayers(3)));
    expect(submitPlayerTricks(lobby, 'p1', 0).success).toBe(false);
  });

  it('blocks completing the round until everyone has reported', () => {
    let state = unwrap(submitPlayerTricks(scoringState(), 'p1', 1));
    expect(completeRound(state).success).toBe(false);

    state = unwrap(submitPlayerTricks(state, 'p0', 0));
    state = unwrap(submitPlayerTricks(state, 'p2', 0));
    expect(completeRound(state).success).toBe(true);
  });

  it('blocks completing the round when the reported tricks do not add up', () => {
    let state = scoringState();
    // Round 1 deals 1 card, but two players each claim a trick.
    state = unwrap(submitPlayerTricks(state, 'p0', 1));
    state = unwrap(submitPlayerTricks(state, 'p1', 1));
    state = unwrap(submitPlayerTricks(state, 'p2', 0));
    const result = completeRound(state);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/add up to 1/);
  });

  it('lets the host submit a round where the others already account for every trick', () => {
    // Round 1 deals 1 card. p1 took it, so p0 (host) and p2 took none and
    // should not have to enter an explicit zero.
    const state = unwrap(submitPlayerTricks(scoringState(), 'p1', 1));
    expect(completeRound(state).success).toBe(false);

    const filled = withUnreportedTricksAsZero(state);
    expect(filled.currentRound?.tricks).toEqual({ p0: 0, p1: 1, p2: 0 });
    const completed = unwrap(completeRound(filled));
    expect(completed.roundHistory[0].tricks).toEqual({ p0: 0, p1: 1, p2: 0 });
  });

  it('leaves tricks alone until the reported ones add up', () => {
    // Round 2 deals 2 cards, so one reported trick leaves the round open and
    // the missing players cannot be assumed to have taken none.
    let state = scoringState();
    state = unwrap(submitPlayerTricks(state, 'p1', 1));
    state = unwrap(submitPlayerTricks(state, 'p0', 0));
    state = unwrap(submitPlayerTricks(state, 'p2', 0));
    state = unwrap(completeRound(state));
    state = unwrap(submitBid(state, 'p2', 0));
    state = unwrap(submitBid(state, 'p0', 0));
    state = unwrap(submitBid(state, 'p1', 0));
    state = unwrap(finalizeBidding(state));
    expect(state.currentRound?.cardsDealt).toBe(2);

    const partial = unwrap(submitPlayerTricks(state, 'p1', 1));
    expect(withUnreportedTricksAsZero(partial).currentRound?.tricks).toEqual({
      p0: null,
      p1: 1,
      p2: null,
    });
  });

  it('tracks who is still missing and how many tricks are claimed', () => {
    const players = makePlayers(3);
    let state = scoringState();
    expect(playersMissingTricks(state.currentRound!.tricks, players).map((p) => p.id)).toEqual([
      'p0',
      'p1',
      'p2',
    ]);

    state = unwrap(submitPlayerTricks(state, 'p1', 1));
    expect(playersMissingTricks(state.currentRound!.tricks, players).map((p) => p.id)).toEqual([
      'p0',
      'p2',
    ]);
    expect(tricksClaimed(state.currentRound!.tricks, ['p0', 'p1', 'p2'])).toBe(1);
  });
});

describe('dealer bidding', () => {
  it('lets the dealer bid a value that makes total bids equal the tricks available', () => {
    const settings: GameSettings = { playerCount: 3, scoringRules: 'standard', maxCards: 2 };
    let state = unwrap(startGame(settings, makePlayers(3)));
    // cardsDealt is 1; p1 and p2 (non-dealers) bid a combined 1.
    state = unwrap(submitBid(state, 'p1', 1));
    state = unwrap(submitBid(state, 'p2', 0));
    // Dealer (p0) bidding 0 would have been forbidden under a "screw the
    // dealer" house rule (total would equal the 1 trick available); this app
    // does not enforce that rule, so it must succeed.
    const result = submitBid(state, 'p0', 0);
    expect(result.success).toBe(true);
  });

  it('lets total bids exceed the number of tricks available', () => {
    const settings: GameSettings = { playerCount: 3, scoringRules: 'standard', maxCards: 2 };
    let state = unwrap(startGame(settings, makePlayers(3)));
    // cardsDealt is 1; every player bids 1, so total bids (3) exceed it.
    state = unwrap(submitBid(state, 'p1', 1));
    state = unwrap(submitBid(state, 'p2', 1));
    const result = submitBid(state, 'p0', 1);
    expect(result.success).toBe(true);
  });
});

describe('full game state machine', () => {
  const settings: GameSettings = { playerCount: 3, scoringRules: 'standard', maxCards: 2 };

  it('walks lobby -> bidding -> scoring -> next round -> finished', () => {
    const players = makePlayers(3);
    let state = unwrap(startGame(settings, players));
    expect(state.status).toBe('bidding');
    expect(state.roundSequence).toEqual([1, 2, 1]);
    expect(state.currentRound?.cardsDealt).toBe(1);

    // Round 1 (1 card): dealer is seat 0, bid order [1,2,0].
    // Dealer bids freely: p1 + p2 already total 1 (== cardsDealt), and the
    // dealer (p0) is still allowed to bid 0, bringing the total to 1.
    state = unwrap(submitBid(state, 'p1', 1));
    state = unwrap(submitBid(state, 'p2', 0));
    state = unwrap(submitBid(state, 'p0', 0));

    state = unwrap(finalizeBidding(state));
    expect(state.status).toBe('scoring');

    state = unwrap(submitTricks(state, { p0: 0, p1: 1, p2: 0 }));
    state = unwrap(completeRound(state));
    expect(state.status).toBe('bidding');
    expect(state.roundHistory).toHaveLength(1);
    // p0 bid 0/took 0 (exact -> 10), p1 bid 1/took 1 (exact -> 11), p2 bid 0/took 0 (exact -> 10).
    expect(state.roundHistory[0].roundScores).toEqual({ p0: 10, p1: 11, p2: 10 });
    expect(state.players.find((p) => p.id === 'p0')?.totalScore).toBe(10);

    // Round 2 (2 cards): dealer rotates to seat 1, bid order [2,0,1].
    // Prior bids (p2, p0) already sum to 2 (== cardsDealt). The dealer (p1)
    // can still bid 2, pushing the total bids to 4 — well past the 2 tricks
    // actually available, since there is no house-rule constraint.
    expect(state.currentRound?.dealerSeat).toBe(1);
    expect(state.currentRound?.cardsDealt).toBe(2);
    state = unwrap(submitBid(state, 'p2', 1));
    state = unwrap(submitBid(state, 'p0', 1));
    state = unwrap(submitBid(state, 'p1', 2));
    state = unwrap(finalizeBidding(state));
    state = unwrap(submitTricks(state, { p0: 1, p1: 1, p2: 0 }));
    state = unwrap(completeRound(state));
    expect(state.status).toBe('bidding');
    expect(state.roundHistory).toHaveLength(2);
    // p0 bid 1/took 1 (exact -> 11), p1 bid 2/took 1 (miss -> 0), p2 bid 1/took 0 (miss -> 0).
    expect(state.roundHistory[1].roundScores).toEqual({ p0: 11, p1: 0, p2: 0 });

    // Round 3 (1 card, final round): dealer rotates to seat 2, bid order [0,1,2].
    expect(state.currentRound?.dealerSeat).toBe(2);
    expect(state.currentRound?.cardsDealt).toBe(1);
    state = unwrap(submitBid(state, 'p0', 0));
    state = unwrap(submitBid(state, 'p1', 0));
    state = unwrap(submitBid(state, 'p2', 0));
    state = unwrap(finalizeBidding(state));
    state = unwrap(submitTricks(state, { p0: 0, p1: 0, p2: 1 }));
    state = unwrap(completeRound(state));

    expect(state.status).toBe('finished');
    expect(state.currentRound).toBeNull();
    expect(state.roundHistory).toHaveLength(3);
  });

  it('rejects bids submitted out of turn', () => {
    const players = makePlayers(3);
    const state = unwrap(startGame(settings, players));
    // Round 1 dealer is seat 0, bid order is [1,2,0] so p0 (seat 0) must wait.
    const result = submitBid(state, 'p0', 0);
    expect(result.success).toBe(false);
  });

  it('rejects finalizing bidding before every player has bid', () => {
    const players = makePlayers(3);
    let state = unwrap(startGame(settings, players));
    state = unwrap(submitBid(state, 'p1', 0));
    const result = finalizeBidding(state);
    expect(result.success).toBe(false);
  });
});
