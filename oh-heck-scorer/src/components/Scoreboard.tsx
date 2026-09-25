import { useState } from 'react';
import { grandTotalsFromHistory } from '../lib/gameRules';
import type { GameRoom } from '../lib/gameRoom';

/**
 * Compact running-total chips. Shared by Bidding, Scoring, and Finished screens.
 * Round-by-round history lives in RoundHistory, meant to sit at the bottom of
 * the screen so the primary actions stay above the fold on a phone.
 */
export function Scoreboard({ room, playerId }: { room: GameRoom; playerId: string }) {
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const leadScore = ranked[0]?.totalScore ?? 0;
  const hasHistory = room.roundHistory.length > 0;

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {ranked.map((player) => {
        const isLeader = hasHistory && leadScore > 0 && player.totalScore === leadScore;
        return (
          <div
            key={player.id}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
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
            <span className="font-mono font-bold">{player.totalScore}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RoundHistory({
  room,
  defaultOpen = false,
}: {
  room: GameRoom;
  defaultOpen?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(defaultOpen);
  const sortedBySeat = [...room.players].sort((a, b) => a.seat - b.seat);
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const leadScore = ranked[0]?.totalScore ?? 0;
  const hasHistory = room.roundHistory.length > 0;
  const playerIds = sortedBySeat.map((player) => player.id);
  const totals = grandTotalsFromHistory(room.roundHistory, playerIds);

  if (!hasHistory) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-felt-light/20 pt-3">
      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        className="self-center text-xs font-medium text-cream/60 underline underline-offset-4"
      >
        {showHistory ? 'Hide round history' : `Round history (${room.roundHistory.length})`}
      </button>

      {showHistory && (
        <div className="max-h-48 overflow-auto rounded-xl border border-felt-light/40">
          <table className="w-full min-w-full text-[11px]">
            <thead className="sticky top-0">
              <tr className="bg-felt-dark/95 text-cream/60">
                <th scope="col" className="whitespace-nowrap px-2 py-1.5 text-left font-semibold">
                  Round
                </th>
                {sortedBySeat.map((player) => (
                  <th
                    key={player.id}
                    scope="col"
                    className="whitespace-nowrap px-2 py-1.5 text-center font-semibold"
                  >
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {room.roundHistory.map((round) => (
                <tr key={round.number} className="border-t border-felt-light/20">
                  <td className="whitespace-nowrap px-2 py-1.5 text-cream/60">
                    {round.number + 1} <span className="text-cream/40">({round.cardsDealt})</span>
                  </td>
                  {sortedBySeat.map((player) => {
                    const bid = round.bids[player.id];
                    const score = round.roundScores[player.id];
                    return (
                      <td key={player.id} className="whitespace-nowrap px-2 py-1.5 text-center font-mono">
                        <span className="text-cream/50">{bid}</span>
                        <span className="mx-0.5 text-cream/30">→</span>
                        <span className={score > 0 ? 'font-bold text-gold' : 'text-cream/40'}>{score}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gold/40 bg-felt-dark/80">
                <th scope="row" className="whitespace-nowrap px-2 py-1.5 text-left font-semibold text-cream">
                  Total
                </th>
                {sortedBySeat.map((player) => {
                  const total = totals[player.id] ?? 0;
                  const isLeader = leadScore > 0 && total === leadScore;
                  return (
                    <td
                      key={player.id}
                      className={`whitespace-nowrap px-2 py-1.5 text-center font-mono text-xs font-bold ${
                        isLeader ? 'text-gold' : 'text-cream'
                      }`}
                    >
                      {total}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
