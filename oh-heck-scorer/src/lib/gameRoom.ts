import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, ensureAnonymousAuth } from './firebase';
import {
  completeRound,
  finalizeBidding,
  startGame,
  submitBid,
  submitTricks,
} from './gameRules';
import type { GameSettings, GameState, Player } from '../types/game';

export const GAMES_COLLECTION = 'games';

/** Excludes visually ambiguous characters (0/O, 1/I) so codes are easy to read aloud and type. */
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 6;

export interface PlayerDoc {
  name: string;
  seat: number;
  totalScore: number;
}

/** The Firestore document shape for `games/{roomId}`. Mirrors `GameState` but
 * keys `players` by uid (a map) instead of an array, so security rules and
 * partial updates can address a single player directly. */
export interface GameDocFields {
  code: string;
  hostId: string;
  status: GameState['status'];
  settings: GameSettings;
  players: Record<string, PlayerDoc>;
  roundSequence: number[];
  currentRound: GameState['currentRound'];
  roundHistory: GameState['roundHistory'];
}

export interface GameRoom extends GameState {
  roomId: string;
  code: string;
  hostId: string;
}

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function playersArrayToMap(players: Player[]): Record<string, PlayerDoc> {
  const map: Record<string, PlayerDoc> = {};
  for (const player of players) {
    map[player.id] = { name: player.name, seat: player.seat, totalScore: player.totalScore };
  }
  return map;
}

export function playersMapToArray(map: Record<string, PlayerDoc> | undefined | null): Player[] {
  return Object.entries(map ?? {})
    .map(([id, player]) => ({ id, name: player.name, seat: player.seat, totalScore: player.totalScore }))
    .sort((a, b) => a.seat - b.seat);
}

/** Pure conversion from in-memory game state to the fields we write to Firestore (no timestamps). */
export function toFirestoreGameFields(
  state: GameState,
  meta: { code: string; hostId: string },
): GameDocFields {
  return {
    code: meta.code,
    hostId: meta.hostId,
    status: state.status,
    settings: state.settings,
    players: playersArrayToMap(state.players),
    roundSequence: state.roundSequence,
    currentRound: state.currentRound,
    roundHistory: state.roundHistory,
  };
}

/** Pure conversion from a Firestore document snapshot's data back to our game state shape. */
export function fromFirestoreGameFields(roomId: string, data: DocumentData): GameRoom {
  return {
    roomId,
    code: data.code ?? roomId,
    hostId: data.hostId,
    status: data.status,
    settings: data.settings,
    players: playersMapToArray(data.players),
    roundSequence: data.roundSequence ?? [],
    currentRound: data.currentRound ?? null,
    roundHistory: data.roundHistory ?? [],
  };
}

async function generateUniqueRoomCode(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const snap = await getDoc(doc(db, GAMES_COLLECTION, code));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate a unique room code — please try again.');
}

export interface CreateGameRoomOptions {
  scoringRules?: GameSettings['scoringRules'];
  maxCards?: GameSettings['maxCards'];
}

/** Creates a new lobby with the current device's player as the host and seat 0. */
export async function createGameRoom(
  hostName: string,
  options: CreateGameRoomOptions = {},
): Promise<{ roomId: string; playerId: string }> {
  const playerId = await ensureAnonymousAuth();
  const code = await generateUniqueRoomCode();
  const hostPlayer: Player = { id: playerId, name: hostName.trim(), seat: 0, totalScore: 0 };
  const state: GameState = {
    status: 'lobby',
    settings: {
      playerCount: 0,
      scoringRules: options.scoringRules ?? 'standard',
      maxCards: options.maxCards,
    },
    players: [hostPlayer],
    roundSequence: [],
    currentRound: null,
    roundHistory: [],
  };

  const db = getDb();
  await setDoc(doc(db, GAMES_COLLECTION, code), {
    ...toFirestoreGameFields(state, { code, hostId: playerId }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { roomId: code, playerId };
}

/** Adds the current device's player to an existing lobby. Safe to call again if already joined. */
export async function joinGameRoom(
  roomCode: string,
  playerName: string,
): Promise<{ roomId: string; playerId: string }> {
  const code = normalizeRoomCode(roomCode);
  const playerId = await ensureAnonymousAuth();
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, code);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error('Room not found. Double-check the code and try again.');
    }
    const data = snap.data() as DocumentData;
    if (data.players && data.players[playerId]) {
      return; // Already joined this room (e.g. reconnect) — nothing to do.
    }
    if (data.status !== 'lobby') {
      throw new Error('This game has already started.');
    }
    const existingSeats = Object.values(data.players ?? {}).map(
      (p) => (p as PlayerDoc).seat,
    );
    const nextSeat = existingSeats.length === 0 ? 0 : Math.max(...existingSeats) + 1;
    tx.update(ref, {
      [`players.${playerId}`]: { name: playerName.trim(), seat: nextSeat, totalScore: 0 },
      updatedAt: serverTimestamp(),
    });
  });

  return { roomId: code, playerId };
}

/** Moves the room from lobby to the first bidding round using whoever has joined so far. */
export async function startGameRoom(roomId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = fromFirestoreGameFields(roomId, snap.data() as DocumentData);
    if (room.status !== 'lobby') throw new Error('This game has already started.');

    const settings: GameSettings = { ...room.settings, playerCount: room.players.length };
    const result = startGame(settings, room.players);
    if (!result.success) throw new Error(result.error);

    tx.update(ref, {
      ...toFirestoreGameFields(result.state, { code: room.code, hostId: room.hostId }),
      updatedAt: serverTimestamp(),
    });
  });
}

/** Submits one player's bid for the active round; enforces turn order via the pure rules engine. */
export async function submitBidToRoom(
  roomId: string,
  playerId: string,
  bid: number,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = fromFirestoreGameFields(roomId, snap.data() as DocumentData);
    const result = submitBid(room, playerId, bid);
    if (!result.success) throw new Error(result.error);
    tx.update(ref, { currentRound: result.state.currentRound, updatedAt: serverTimestamp() });
  });
}

/** Moves the round from bidding to scoring once every player has bid. */
export async function finalizeBiddingForRoom(roomId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = fromFirestoreGameFields(roomId, snap.data() as DocumentData);
    const result = finalizeBidding(room);
    if (!result.success) throw new Error(result.error);
    tx.update(ref, { status: result.state.status, updatedAt: serverTimestamp() });
  });
}

/** Records tricks taken for every player in the active round. */
export async function submitTricksToRoom(
  roomId: string,
  tricks: Record<string, number>,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = fromFirestoreGameFields(roomId, snap.data() as DocumentData);
    const result = submitTricks(room, tricks);
    if (!result.success) throw new Error(result.error);
    tx.update(ref, { currentRound: result.state.currentRound, updatedAt: serverTimestamp() });
  });
}

/** Scores the round, appends it to history, and either starts the next round or finishes the game. */
export async function completeRoundForRoom(roomId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Room not found.');
    const room = fromFirestoreGameFields(roomId, snap.data() as DocumentData);
    const result = completeRound(room);
    if (!result.success) throw new Error(result.error);
    tx.update(ref, {
      status: result.state.status,
      players: playersArrayToMap(result.state.players),
      currentRound: result.state.currentRound,
      roundHistory: result.state.roundHistory,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Subscribes to live updates for a room. Calls `onChange(null)` if the room
 * doesn't (or no longer) exists. Returns an unsubscribe function — callers
 * must call it (e.g. in a `useEffect` cleanup) to avoid leaking listeners.
 */
export function subscribeToGameRoom(
  roomId: string,
  onChange: (room: GameRoom | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(fromFirestoreGameFields(roomId, snap.data()));
    },
    (error) => onError?.(error),
  );
}

/** One-shot fetch, useful for checking a room exists before subscribing (e.g. on the Join screen). */
export async function fetchGameRoom(roomId: string): Promise<GameRoom | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, GAMES_COLLECTION, roomId));
  if (!snap.exists()) return null;
  return fromFirestoreGameFields(roomId, snap.data());
}

// Re-exported so UI code can update a room's display fields without importing updateDoc directly.
export async function renamePlayerInRoom(
  roomId: string,
  playerId: string,
  name: string,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, GAMES_COLLECTION, roomId);
  await updateDoc(ref, {
    [`players.${playerId}.name`]: name.trim(),
    updatedAt: serverTimestamp(),
  });
}
