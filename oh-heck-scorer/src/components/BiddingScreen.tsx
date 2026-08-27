import { useState } from 'react';
import { finalizeBiddingForRoom, submitBidToRoom, type GameRoom } from '../lib/gameRoom';
import { ErrorBanner } from './ui';
import { RoundHeader } from './RoundHeader';

export function BiddingScreen({ room, playerId }: { room: GameRoom; playerId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const round = room.currentRound;

  if (!round) return null;

  const sortedPlayers = [...room.players].sort((a, b) => a.seat - b.seat);
  const dealer = sortedPlayers.find((p) => p.seat === round.dealerSeat);
  const currentBidder = sortedPlayers.find((p) => p.seat === round.bidTurnSeat);
  const isMyTurn = currentBidder?.id === playerId;
  const bidOptions = Array.from({ length: round.cardsDealt + 1 }, (_, i) => i);

  async function handleBid(bid: number) {
    setBusy(true);
    setError(null);
    try {
      await submitBidToRoom(room.roomId, playerId, bid);
      try {
        // Best-effort: whichever client happens to submit the last bid
        // flips the round into scoring. This fails harmlessly with "not all
        // players have bid yet" until that's actually true.
        await finalizeBiddingForRoom(room.roomId);
      } catch {
        // Expected until every player has bid.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit that bid.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <RoundHeader
        roundNumber={round.number + 1}
        totalRounds={room.roundSequence.length}
        cardsDealt={round.cardsDealt}
        dealerName={dealer?.name ?? '—'}
      />

      {isMyTurn ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-medium text-gold">Your turn to bid</p>
          <div className="flex flex-wrap justify-center gap-2">
            {bidOptions.map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => handleBid(n)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gold bg-felt/40 text-lg font-bold text-cream transition-transform active:scale-90 disabled:opacity-40 disabled:active:scale-100"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-cream/60">
          Waiting for {currentBidder?.name ?? 'the next player'} to bid…
        </p>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cream/60">Bids</h2>
        <ul className="flex flex-col gap-2">
          {sortedPlayers.map((player) => {
            const bid = round.bids[player.id];
            const isDealer = player.seat === round.dealerSeat;
            const isTurn = player.seat === round.bidTurnSeat;
            return (
              <li
                key={player.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isTurn ? 'border-gold bg-gold/10' : 'border-felt-light/40 bg-felt-dark/50'
                }`}
              >
                <span className="font-medium text-cream">
                  {player.name}
                  {player.id === playerId && <span className="text-cream/50"> (you)</span>}
                  {isDealer && <span className="ml-2 text-xs text-cream/50">Dealer</span>}
                </span>
                <span className="font-mono text-lg font-bold text-gold">{bid === null ? '—' : bid}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
