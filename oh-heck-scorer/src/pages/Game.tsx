import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { Lobby } from '../components/Lobby';
import { BiddingScreen } from '../components/BiddingScreen';
import { ScoringScreen } from '../components/ScoringScreen';
import { FinishedScreen } from '../components/FinishedScreen';
import { ErrorBanner, SecondaryButton } from '../components/ui';
import { useGameRoom } from '../hooks/useGameRoom';
import { usePlayerId } from '../hooks/usePlayerId';
import { setLastRoomId } from '../lib/session';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, loading, error } = useGameRoom(roomId ?? null);
  const { playerId, error: authError } = usePlayerId();

  useEffect(() => {
    if (roomId) setLastRoomId(roomId);
  }, [roomId]);

  // Someone opened a direct /game/:roomId link without having joined yet
  // (e.g. a bookmark) — send them to the join screen for this room instead.
  useEffect(() => {
    if (room && playerId && !room.players.some((player) => player.id === playerId)) {
      navigate(`/join/${room.code}`, { replace: true });
    }
  }, [room, playerId, navigate]);

  if (!roomId) return null;

  if (loading || (room && !playerId && !authError)) {
    return (
      <Screen subtitle="Loading…">
        <p className="flex-1 text-center text-cream/60">Connecting…</p>
      </Screen>
    );
  }

  if (error || authError) {
    return (
      <Screen subtitle="Something went wrong">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <ErrorBanner>{error ?? authError}</ErrorBanner>
          <SecondaryButton onClick={() => navigate('/')}>Back home</SecondaryButton>
        </div>
      </Screen>
    );
  }

  if (!room) {
    return (
      <Screen subtitle="Room not found">
        <div className="flex flex-1 flex-col justify-center gap-4 text-center">
          <p className="text-cream/70">We couldn&apos;t find a room with code {roomId}.</p>
          <SecondaryButton onClick={() => navigate('/')}>Back home</SecondaryButton>
        </div>
      </Screen>
    );
  }

  if (!playerId) return null;

  return (
    <Screen subtitle={`Room ${room.code}`}>
      {room.status === 'lobby' && <Lobby room={room} playerId={playerId} />}
      {room.status === 'bidding' && <BiddingScreen room={room} playerId={playerId} />}
      {room.status === 'scoring' && <ScoringScreen room={room} playerId={playerId} />}
      {room.status === 'finished' && <FinishedScreen room={room} playerId={playerId} />}
    </Screen>
  );
}
