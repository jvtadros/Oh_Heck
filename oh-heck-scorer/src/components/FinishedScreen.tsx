import { useNavigate } from 'react-router-dom';
import type { GameRoom } from '../lib/gameRoom';
import { SecondaryButton } from './ui';
import { Scoreboard } from './Scoreboard';

export function FinishedScreen({ room, playerId }: { room: GameRoom; playerId: string }) {
  const navigate = useNavigate();
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const winners = ranked.filter((p) => p.totalScore === ranked[0]?.totalScore);
  const winnerText =
    winners.length > 1 ? `${winners.map((p) => p.name).join(' & ')} tie!` : `${ranked[0]?.name ?? 'Someone'} wins!`;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-2xl border border-gold/30 bg-felt/40 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-cream/60">Game complete</p>
        <p className="mt-1 text-2xl font-bold text-gold">{winnerText}</p>
      </div>

      <Scoreboard room={room} playerId={playerId} defaultShowHistory />

      <SecondaryButton onClick={() => navigate('/')}>Back home</SecondaryButton>
    </section>
  );
}
