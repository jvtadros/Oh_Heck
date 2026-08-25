import { useState } from 'react';
import { startGameRoom, type GameRoom } from '../lib/gameRoom';
import { ErrorBanner, PrimaryButton } from './ui';

export function Lobby({ room, playerId }: { room: GameRoom; playerId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isHost = playerId === room.hostId;
  const joinUrl = `${window.location.origin}/join/${room.code}`;

  async function handleShare() {
    setError(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Oh Heck game',
          text: `Join my Oh Heck game with code ${room.code}`,
          url: joinUrl,
        });
        return;
      } catch {
        // The user cancelled the share sheet, or it's unsupported — fall
        // back to copying the link below.
      }
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link — share the room code instead.');
    }
  }

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      await startGameRoom(room.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the game.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-2xl border border-gold/30 bg-felt/40 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-cream/60">Room code</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-gold">{room.code}</p>
        <button
          type="button"
          onClick={handleShare}
          className="mt-3 text-sm font-medium text-cream/70 underline underline-offset-4"
        >
          {copied ? 'Link copied!' : 'Share join link'}
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cream/60">
          Players ({room.players.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {room.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-felt-light/40 bg-felt-dark/50 px-4 py-3"
            >
              <span className="font-medium text-cream">
                {player.name}
                {player.id === playerId && <span className="text-cream/50"> (you)</span>}
              </span>
              {player.id === room.hostId && (
                <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold">Host</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isHost ? (
        <PrimaryButton onClick={handleStart} disabled={busy || room.players.length < 2}>
          {busy ? 'Starting…' : room.players.length < 2 ? 'Waiting for more players…' : 'Start game'}
        </PrimaryButton>
      ) : (
        <p className="text-center text-sm text-cream/60">Waiting for the host to start the game…</p>
      )}
    </section>
  );
}
