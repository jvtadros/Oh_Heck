import { useEffect, useState } from 'react';
import { ensureAnonymousAuth } from '../lib/firebase';

export interface UsePlayerIdResult {
  playerId: string | null;
  error: string | null;
}

/** Resolves to the current device's stable Firebase Anonymous Auth uid. */
export function usePlayerId(): UsePlayerIdResult {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureAnonymousAuth()
      .then((uid) => {
        if (!cancelled) setPlayerId(uid);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not sign in.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { playerId, error };
}
