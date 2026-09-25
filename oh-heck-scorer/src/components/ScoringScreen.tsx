import { useEffect, useMemo, useState } from 'react';
import { completeRoundForRoom, submitPlayerTricksToRoom, type GameRoom } from '../lib/gameRoom';
import { playersMissingTricks, tricksClaimed } from '../lib/gameRules';
import { ErrorBanner, PrimaryButton, SecondaryButton, StepperButton } from './ui';
import { RoundHeader } from './RoundHeader';
import { RoundHistory, Scoreboard } from './Scoreboard';

export function ScoringScreen({ room, playerId }: { room: GameRoom; playerId: string }) {
  const round = room.currentRound;
  const sortedPlayers = useMemo(() => [...room.players].sort((a, b) => a.seat - b.seat), [room.players]);
  /** Local edits not yet written to Firestore, keyed by player id. */
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundNumber = round?.number;
  useEffect(() => {
    setDrafts({});
    setError(null);
  }, [roundNumber]);

  if (!round) return null;

  const isHost = playerId === room.hostId;
  const cardsDealt = round.cardsDealt;
  const dealer = sortedPlayers.find((p) => p.seat === round.dealerSeat);
  const missing = playersMissingTricks(round.tricks, sortedPlayers);
  const claimed = tricksClaimed(
    round.tricks,
    sortedPlayers.map((p) => p.id),
  );
  const iSubmitted = round.tricks[playerId] !== null && round.tricks[playerId] !== undefined;

  // Rows the current user may set: their own, plus everyone's if they're host.
  const canEdit = (id: string) => isHost || id === playerId;
  const valueFor = (id: string) => drafts[id] ?? round.tricks[id] ?? 0;
  const isDirty = (id: string) => id in drafts && drafts[id] !== round.tricks[id];
  const dirtyIds = sortedPlayers.map((p) => p.id).filter(isDirty);
  // Once the reported tricks account for the whole round, anyone who hasn't
  // reported must have taken none, so the host can submit without them.
  const roundAddsUp = claimed === cardsDealt;

  function updateDraft(id: string, delta: number) {
    setDrafts((prev) => ({
      ...prev,
      [id]: Math.min(cardsDealt, Math.max(0, valueFor(id) + delta)),
    }));
  }

  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    await runAction(async () => {
      for (const id of dirtyIds) {
        await submitPlayerTricksToRoom(room.roomId, id, drafts[id]);
      }
      setDrafts({});
    }, 'Could not save tricks for this round.');
  }

  async function handleSubmitRound() {
    await runAction(
      () => completeRoundForRoom(room.roomId),
      'Could not submit the scores for this round.',
    );
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

      <p className="text-center text-xs text-cream/70">
        {isHost
          ? 'Everyone enters their own tricks. You can correct any number, then submit the round.'
          : iSubmitted
            ? 'Tricks saved. You can change them until the host submits the round.'
            : 'How many tricks did you take? Set your count, then save.'}
      </p>

      <ul className="flex flex-col gap-1.5">
        {sortedPlayers.map((player) => {
          const editable = canEdit(player.id);
          const submitted = round.tricks[player.id] !== null && round.tricks[player.id] !== undefined;
          const dirty = isDirty(player.id);
          return (
            <li
              key={player.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                dirty ? 'border-gold/70 bg-gold/5' : 'border-felt-light/40 bg-felt-dark/50'
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-cream">
                  {player.name}
                  {player.id === playerId && <span className="text-cream/50"> (you)</span>}
                </span>
                <span className="text-xs text-cream/50">
                  Bid {round.bids[player.id] ?? '—'}
                  {dirty ? ' · unsaved' : !submitted ? ' · waiting' : ''}
                </span>
              </div>

              {editable ? (
                <div className="flex items-center gap-2">
                  <StepperButton
                    onClick={() => updateDraft(player.id, -1)}
                    disabled={busy || valueFor(player.id) <= 0}
                    aria-label={`Decrease tricks for ${player.name}`}
                  >
                    −
                  </StepperButton>
                  <span className="w-6 text-center font-mono text-lg font-bold text-gold">
                    {valueFor(player.id)}
                  </span>
                  <StepperButton
                    onClick={() => updateDraft(player.id, 1)}
                    disabled={busy || valueFor(player.id) >= cardsDealt}
                    aria-label={`Increase tricks for ${player.name}`}
                  >
                    +
                  </StepperButton>
                </div>
              ) : (
                <span className="w-6 text-center font-mono text-lg font-bold text-gold">
                  {submitted ? round.tricks[player.id] : '—'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {roundAddsUp ? (
        <p className="text-center text-xs text-cream/50">
          All {cardsDealt} tricks accounted for
          {missing.length > 0 && ` · ${missing.map((p) => p.name).join(', ')} took none`}
        </p>
      ) : claimed > cardsDealt ? (
        <p className="text-center text-xs text-gold">
          That is {claimed} tricks, more than the {cardsDealt} dealt.
          {isHost ? ' Correct a number above, then submit.' : ' Check your count with the host.'}
        </p>
      ) : missing.length > 0 ? (
        <p className="text-center text-xs text-cream/50">
          Waiting on {missing.map((p) => p.name).join(', ')} · {claimed} of {cardsDealt} so far
        </p>
      ) : (
        <p className="text-center text-xs text-gold">
          Everyone has reported, but the tricks add up to {claimed} instead of {cardsDealt}.
          {isHost ? ' Correct a number above, then submit.' : ' Check your count with the host.'}
        </p>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {dirtyIds.length > 0 && (
        <PrimaryButton onClick={handleSave} disabled={busy}>
          {busy
            ? 'Saving…'
            : isHost && dirtyIds.some((id) => id !== playerId)
              ? 'Save tricks'
              : 'Save my tricks'}
        </PrimaryButton>
      )}

      {isHost ? (
        <SecondaryButton
          onClick={handleSubmitRound}
          disabled={busy || !roundAddsUp || dirtyIds.length > 0}
          className={roundAddsUp && dirtyIds.length === 0 ? 'border-gold text-gold' : ''}
        >
          {busy ? 'Submitting…' : 'Submit scores'}
        </SecondaryButton>
      ) : (
        (iSubmitted || roundAddsUp) &&
        dirtyIds.length === 0 && (
          <p className="text-center text-sm text-cream/60">Waiting for the host to submit the round…</p>
        )
      )}

      <RoundHistory room={room} />
    </section>
  );
}
