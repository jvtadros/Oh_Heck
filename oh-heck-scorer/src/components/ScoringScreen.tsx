import { useMemo, useState } from 'react';
import { completeRoundForRoom, submitTricksToRoom, type GameRoom } from '../lib/gameRoom';
import { ErrorBanner, PrimaryButton, StepperButton } from './ui';
import { RoundHeader } from './RoundHeader';
import { RoundHistory, Scoreboard } from './Scoreboard';

export function ScoringScreen({ room, playerId }: { room: GameRoom; playerId: string }) {
  const round = room.currentRound;
  const sortedPlayers = useMemo(() => [...room.players].sort((a, b) => a.seat - b.seat), [room.players]);
  const [tricks, setTricks] = useState<Record<string, number>>(() =>
    Object.fromEntries(sortedPlayers.map((p) => [p.id, 0])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!round) return null;

  const isHost = playerId === room.hostId;
  const cardsDealt = round.cardsDealt;
  const dealer = sortedPlayers.find((p) => p.seat === round.dealerSeat);
  const total = Object.values(tricks).reduce((sum, n) => sum + n, 0);
  const remaining = cardsDealt - total;

  function updateTricks(id: string, delta: number) {
    setTricks((prev) => {
      const next = Math.min(cardsDealt, Math.max(0, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await submitTricksToRoom(room.roomId, tricks);
      await completeRoundForRoom(room.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record tricks for this round.');
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-3">
      <RoundHeader
        roundNumber={round.number + 1}
        totalRounds={room.roundSequence.length}
        cardsDealt={round.cardsDealt}
        dealerName={dealer?.name ?? '—'}
      />

      <Scoreboard room={room} playerId={playerId} />

      {isHost ? (
        <>
          <p className="text-center text-xs text-cream/70">
            Enter tricks taken — must add up to {round.cardsDealt}.
          </p>

          <ul className="flex flex-col gap-1.5">
            {sortedPlayers.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-felt-light/40 bg-felt-dark/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-cream">
                    {player.name}
                    {player.id === playerId && <span className="text-cream/50"> (you)</span>}
                  </span>
                  <span className="text-xs text-cream/50">Bid {round.bids[player.id] ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StepperButton
                    onClick={() => updateTricks(player.id, -1)}
                    disabled={busy || tricks[player.id] <= 0}
                    aria-label={`Decrease tricks for ${player.name}`}
                  >
                    −
                  </StepperButton>
                  <span className="w-6 text-center font-mono text-lg font-bold text-gold">
                    {tricks[player.id]}
                  </span>
                  <StepperButton
                    onClick={() => updateTricks(player.id, 1)}
                    disabled={busy || tricks[player.id] >= round.cardsDealt}
                    aria-label={`Increase tricks for ${player.name}`}
                  >
                    +
                  </StepperButton>
                </div>
              </li>
            ))}
          </ul>

          <p className={`text-center text-xs ${remaining === 0 ? 'text-cream/50' : 'text-gold'}`}>
            {remaining === 0
              ? `${total} of ${round.cardsDealt} tricks accounted for`
              : `${remaining} more trick${remaining === 1 ? '' : 's'} to assign`}
          </p>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <PrimaryButton onClick={handleSubmit} disabled={busy || remaining !== 0}>
            {busy ? 'Saving…' : 'Submit scores'}
          </PrimaryButton>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-cream/60">Waiting for the host to record tricks…</p>
          <ul className="flex flex-col gap-1.5">
            {sortedPlayers.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-xl border border-felt-light/40 bg-felt-dark/50 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-cream">
                  {player.name}
                  {player.id === playerId && <span className="text-cream/50"> (you)</span>}
                </span>
                <span className="text-sm text-cream/60">Bid {round.bids[player.id] ?? '—'}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto">
        <RoundHistory room={room} />
      </div>
    </section>
  );
}
