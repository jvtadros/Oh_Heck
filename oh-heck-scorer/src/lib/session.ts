/**
 * Small localStorage helpers for convenience only (prefilling forms, offering
 * a "rejoin" shortcut). The real source of truth for identity is the
 * Firebase Anonymous Auth uid (see firebase.ts) and room membership — these
 * values are never used to authorize anything.
 */
const LAST_PLAYER_NAME_KEY = 'ohHeck:lastPlayerName';
const LAST_ROOM_ID_KEY = 'ohHeck:lastRoomId';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (private browsing, storage disabled, etc).
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function getLastPlayerName(): string {
  return safeGet(LAST_PLAYER_NAME_KEY) ?? '';
}

export function setLastPlayerName(name: string): void {
  safeSet(LAST_PLAYER_NAME_KEY, name);
}

export function getLastRoomId(): string | null {
  return safeGet(LAST_ROOM_ID_KEY);
}

export function setLastRoomId(roomId: string): void {
  safeSet(LAST_ROOM_ID_KEY, roomId);
}

export function clearLastRoomId(): void {
  safeRemove(LAST_ROOM_ID_KEY);
}
