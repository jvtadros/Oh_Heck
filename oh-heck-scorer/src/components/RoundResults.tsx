import { calculateRoundScore } from '../lib/gameRules';
import type { GameRoom } from '../lib/gameRoom';
import { ErrorBanner, PrimaryButton } from './ui';

/**
 * Shown after the host records tricks for a round, before the round is
 * advanced. Lets everyone (especially the host) review this round's scores
 * and the updated running totals, then the host continues.
 */
export function RoundResults({
  room,
  playerId,
  isHost,
  busy,
  error,
  onContinue,
}: {
  room: GameRoom;
  playerId: string;
  isHost: boolean;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
}) {
  const round = room.currentRound;
  if (!round) return null;

  const sortedPlayers = [...room.players].sort((a, b) => a.seat - b.seat);
  const isLastRound = round.number + 1 >= room.roundSequence.length;

  const rows = sortedPlayers.map((player) => {
    const bid = round.bids[player.id] ?? 0;
    const tricks = round.tricks[player.id] ?? 0;
    const roundScore = calculateRoundScore(bid, tricks, room.settings.scoringRules);
    return {
      player,
      bid,
      tricks,
      roundScore,
      newTotal: player.totalScore + roundScore,
    };
  });

  const rankedTotals = [...rows].sort((a, b) => b.newTotal - a.newTotal);
  const lead = rankedTotals[0]?.newTotal ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-cream/60">Round {round.number + 1} complete</p>
        <h2 className="mt-1 text-xl font-bold text-cream">Scores & standings</h2>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {rankedTotals.map(({ player, newTotal }) => {
          const isLeader = lead > 0 && newTotal === lead;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                isLeader
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-felt-light/40 bg-felt-dark/40 text-cream/80'
              }`}
            >
              {isLeader && <span aria-hidden="true">★</span>}
              <span className="font-medium">
                {player.name}
                {player.id === playerId && <span className="opacity-70"> (you)</span>}
              </span>
              <span className="font-mono font-bold">{newTotal}</span>
            </div>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ player, bid, tricks, roundScore, newTotal }) => (
          <li
            key={player.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-felt-light/40 bg-felt-dark/50 px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="font-medium text-cream">
                {player.name}
                {player.id === playerId && <span className="text-cream/50"> (you)</span>}
              </span>
              <span className="text-xs text-cream/50">
                Bid {bid} · Took {tricks}
              </span>
            </div>
            <div className="text-right">
              <p className={`font-mono text-lg font-bold ${roundScore > 0 ? 'text-gold' : 'text-cream/40'}`}>
                {roundScore > 0 ? `+${roundScore}` : roundScore}
              </p>
              <p className="text-xs text-cream/50">
                Total <span className="font-mono font-semibold text-cream/80">{newTotal}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isHost ? (
        <PrimaryButton onClick={onContinue} disabled={busy}>
          {busy ? 'Continuing…' : isLastRound ? 'See final standings' : 'Next round'}
        </PrimaryButton>
      ) : (
        <p className="text-center text-sm text-cream/60">Waiting for the host to continue…</p>
      )}
    </div>
  );
}
