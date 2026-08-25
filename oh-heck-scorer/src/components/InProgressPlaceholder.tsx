import type { GameRoom } from '../lib/gameRoom';

export function InProgressPlaceholder({ room, playerId }: { room: GameRoom; playerId: string }) {
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const roundNumber = (room.currentRound?.number ?? 0) + 1;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-2xl border border-gold/30 bg-felt/40 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-cream/60">
          {room.status === 'finished' ? 'Game complete' : `Round ${roundNumber} of ${room.roundSequence.length}`}
        </p>
        {room.currentRound && room.status !== 'finished' && (
          <p className="mt-1 text-sm text-cream/70">
            {room.currentRound.cardsDealt} card{room.currentRound.cardsDealt === 1 ? '' : 's'} this round
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cream/60">Scoreboard</h2>
        <ul className="flex flex-col gap-2">
          {ranked.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-felt-light/40 bg-felt-dark/50 px-4 py-3"
            >
              <span className="font-medium text-cream">
                {player.name}
                {player.id === playerId && <span className="text-cream/50"> (you)</span>}
              </span>
              <span className="font-mono text-lg font-bold text-gold">{player.totalScore}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-cream/50">
        Bidding and scoring screens are coming in the next update — for now, the
        scoreboard updates live as rounds are completed.
      </p>
    </section>
  );
}
