import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { ErrorBanner, PrimaryButton, TextField } from '../components/ui';
import { joinGameRoom } from '../lib/gameRoom';
import { getLastPlayerName, setLastPlayerName, setLastRoomId } from '../lib/session';

export default function Join() {
  const navigate = useNavigate();
  const { code: codeFromLink } = useParams<{ code?: string }>();
  const [code, setCode] = useState((codeFromLink ?? '').toUpperCase());
  const [name, setName] = useState(() => getLastPlayerName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode) {
      setError("Enter the room code your host shared.");
      return;
    }
    if (!trimmedName) {
      setError('Enter your name to join.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setLastPlayerName(trimmedName);
      const { roomId } = await joinGameRoom(trimmedCode, trimmedName);
      setLastRoomId(roomId);
      navigate(`/game/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that game. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen subtitle="Join a game">
      <section className="flex flex-1 flex-col justify-center gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-cream">Join with code</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            Ask your host for the 6-character room code.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleJoin}>
          <TextField
            label="Room code"
            name="code"
            autoFocus={!codeFromLink}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            className="text-center font-mono text-xl tracking-[0.3em]"
          />
          <TextField
            label="Your name"
            name="name"
            autoFocus={!!codeFromLink}
            autoComplete="name"
            maxLength={24}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sam"
          />
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? 'Joining…' : 'Join game'}
          </PrimaryButton>
        </form>
      </section>
    </Screen>
  );
}
