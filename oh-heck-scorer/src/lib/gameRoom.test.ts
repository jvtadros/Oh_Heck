import { describe, expect, it } from 'vitest';
import type { GameState, Player } from '../types/game';
import {
  fromFirestoreGameFields,
  generateRoomCode,
  normalizeRoomCode,
  playersArrayToMap,
  playersMapToArray,
  toFirestoreGameFields,
} from './gameRoom';

describe('generateRoomCode', () => {
  it('produces a 6-character code using only unambiguous characters', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]+$/);
    expect(code).not.toMatch(/[01OI]/);
  });

  it('produces different codes across calls (extremely unlikely to collide)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('normalizeRoomCode', () => {
  it('trims whitespace and upper-cases the code', () => {
    expect(normalizeRoomCode('  abc123 ')).toBe('ABC123');
  });
});

describe('players array <-> map conversion', () => {
  const players: Player[] = [
    { id: 'uid-b', name: 'Bea', seat: 1, totalScore: 20 },
    { id: 'uid-a', name: 'Ada', seat: 0, totalScore: 10 },
  ];

  it('maps players by id for Firestore storage', () => {
    const map = playersArrayToMap(players);
    expect(map).toEqual({
      'uid-b': { name: 'Bea', seat: 1, totalScore: 20 },
      'uid-a': { name: 'Ada', seat: 0, totalScore: 10 },
    });
  });

  it('converts back to a seat-ordered array', () => {
    const map = playersArrayToMap(players);
    const roundTripped = playersMapToArray(map);
    expect(roundTripped).toEqual([
      { id: 'uid-a', name: 'Ada', seat: 0, totalScore: 10 },
      { id: 'uid-b', name: 'Bea', seat: 1, totalScore: 20 },
    ]);
  });

  it('treats a missing map as no players', () => {
    expect(playersMapToArray(undefined)).toEqual([]);
    expect(playersMapToArray(null)).toEqual([]);
  });
});

describe('game state <-> Firestore document conversion', () => {
  const state: GameState = {
    status: 'bidding',
    settings: { playerCount: 2, scoringRules: 'standard' },
    players: [
      { id: 'uid-a', name: 'Ada', seat: 0, totalScore: 0 },
      { id: 'uid-b', name: 'Bea', seat: 1, totalScore: 0 },
    ],
    roundSequence: [1, 2, 1],
    currentRound: {
      number: 0,
      cardsDealt: 1,
      dealerSeat: 0,
      bidOrder: [1, 0],
      bids: { 'uid-a': null, 'uid-b': 1 },
      tricks: { 'uid-a': null, 'uid-b': null },
      bidTurnSeat: 0,
    },
    roundHistory: [],
  };

  it('round-trips through the Firestore document shape', () => {
    const docFields = toFirestoreGameFields(state, { code: 'ABC123', hostId: 'uid-a' });
    expect(docFields.players).toEqual({
      'uid-a': { name: 'Ada', seat: 0, totalScore: 0 },
      'uid-b': { name: 'Bea', seat: 1, totalScore: 0 },
    });

    const room = fromFirestoreGameFields('ABC123', docFields);
    expect(room.roomId).toBe('ABC123');
    expect(room.code).toBe('ABC123');
    expect(room.hostId).toBe('uid-a');
    expect(room.status).toBe(state.status);
    expect(room.settings).toEqual(state.settings);
    expect(room.players).toEqual(state.players);
    expect(room.roundSequence).toEqual(state.roundSequence);
    expect(room.currentRound).toEqual(state.currentRound);
    expect(room.roundHistory).toEqual(state.roundHistory);
  });

  it('defaults missing optional fields when reading a sparse document', () => {
    const room = fromFirestoreGameFields('XYZ999', {
      hostId: 'uid-a',
      status: 'lobby',
      settings: { playerCount: 0, scoringRules: 'standard' },
    });
    expect(room.players).toEqual([]);
    expect(room.roundSequence).toEqual([]);
    expect(room.currentRound).toBeNull();
    expect(room.roundHistory).toEqual([]);
    expect(room.code).toBe('XYZ999');
  });
});
