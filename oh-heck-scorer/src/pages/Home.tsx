import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { ErrorBanner, PrimaryButton, SecondaryButton, TextField } from '../components/ui';
import { createGameRoom } from '../lib/gameRoom';
import { getLastPlayerName, getLastRoomId, setLastPlayerName, setLastRoomId } from '../lib/session';

type Mode = 'idle' | 'create';

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('idle');
  const [name, setName] = useState(() => getLastPlayerName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRoomId = getLastRoomId();

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter your name to host a game.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setLastPlayerName(trimmedName);
      const { roomId } = await createGameRoom(trimmedName);
      setLastRoomId(roomId);
      navigate(`/game/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a game. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen
      subtitle="Multiplayer scoring"
      footer={
        <p className="text-xs text-cream/40">
          Install this app from your browser menu for the best experience.
        </p>
      }
    >
      <section className="flex flex-1 flex-col justify-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-cream">Game night, synced</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            Host a room, share a code, and keep everyone on the same live scoreboard — on
            iPhone or Android.
          </p>
        </div>

        {mode === 'idle' && (
          <div className="flex flex-col gap-3">
            {lastRoomId && (
              <SecondaryButton onClick={() => navigate(`/game/${lastRoomId}`)}>
                Rejoin game {lastRoomId}
              </SecondaryButton>
            )}
            <PrimaryButton onClick={() => setMode('create')}>Create game</PrimaryButton>
            <SecondaryButton onClick={() => navigate('/join')}>Join with code</SecondaryButton>
          </div>
        )}

        {mode === 'create' && (
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <TextField
              label="Your name"
              name="name"
              autoFocus
              autoComplete="name"
              maxLength={24}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Sam"
            />
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <div className="flex flex-col gap-3">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create game'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setMode('idle')} disabled={busy}>
                Back
              </SecondaryButton>
            </div>
          </form>
        )}
      </section>
    </Screen>
  );
}
