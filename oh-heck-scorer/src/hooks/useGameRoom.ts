import { useEffect, useState } from 'react';
import { subscribeToGameRoom, type GameRoom } from '../lib/gameRoom';

export interface UseGameRoomResult {
  room: GameRoom | null;
  loading: boolean;
  error: string | null;
}

/** Subscribes to live updates for a room for as long as the component is mounted. */
export function useGameRoom(roomId: string | null): UseGameRoomResult {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToGameRoom(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [roomId]);

  return { room, loading, error };
}
