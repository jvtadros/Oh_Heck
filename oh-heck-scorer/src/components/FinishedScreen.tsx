import { useNavigate } from 'react-router-dom';
import type { GameRoom } from '../lib/gameRoom';
import { SecondaryButton } from './ui';

export function FinishedScreen({ room, playerId }: { room: GameRoom; playerId: string }) {
  const navigate = useNavigate();
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const topScore = ranked[0]?.totalScore;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-2xl border border-gold/30 bg-felt/40 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-cream/60">Game complete</p>
        <p className="mt-1 text-2xl font-bold text-gold">{ranked[0]?.name ?? 'Someone'} wins!</p>
      </div>

      <ul className="flex flex-col gap-2">
        {ranked.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              player.totalScore === topScore
                ? 'border-gold bg-gold/10'
                : 'border-felt-light/40 bg-felt-dark/50'
            }`}
          >
            <span className="font-medium text-cream">
              #{index + 1} {player.name}
              {player.id === playerId && <span className="text-cream/50"> (you)</span>}
            </span>
            <span className="font-mono text-lg font-bold text-gold">{player.totalScore}</span>
          </li>
        ))}
      </ul>

      <SecondaryButton onClick={() => navigate('/')}>Back home</SecondaryButton>
    </section>
  );
}
