import { useState } from 'react';
import { grandTotalsFromHistory } from '../lib/gameRules';
import type { GameRoom } from '../lib/gameRoom';

/**
 * Running totals (always visible) plus an expandable round-by-round history
 * table. Shared by the Bidding, Scoring, and Finished screens so standings
 * are always reachable during a game, not just at the end.
 */
export function Scoreboard({
  room,
  playerId,
  defaultShowHistory = false,
}: {
  room: GameRoom;
  playerId: string;
  defaultShowHistory?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(defaultShowHistory);
  const sortedBySeat = [...room.players].sort((a, b) => a.seat - b.seat);
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore);
  const leadScore = ranked[0]?.totalScore ?? 0;
  const hasHistory = room.roundHistory.length > 0;
  const playerIds = sortedBySeat.map((player) => player.id);
  const totals = grandTotalsFromHistory(room.roundHistory, playerIds);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {ranked.map((player) => {
          const isLeader = hasHistory && leadScore > 0 && player.totalScore === leadScore;
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
              <span className="font-mono font-bold">{player.totalScore}</span>
            </div>
          );
        })}
      </div>

      {hasHistory && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="self-center text-sm font-medium text-cream/60 underline underline-offset-4"
        >
          {showHistory ? 'Hide round history' : `Show round history (${room.roundHistory.length})`}
        </button>
      )}

      {showHistory && hasHistory && (
        <div className="overflow-x-auto rounded-xl border border-felt-light/40">
          <table className="w-full min-w-full text-xs">
            <thead>
              <tr className="bg-felt-dark/60 text-cream/60">
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                  Round
                </th>
                {sortedBySeat.map((player) => (
                  <th key={player.id} scope="col" className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {room.roundHistory.map((round) => (
                <tr key={round.number} className="border-t border-felt-light/20">
                  <td className="whitespace-nowrap px-3 py-2 text-cream/60">
                    {round.number + 1} <span className="text-cream/40">({round.cardsDealt})</span>
                  </td>
                  {sortedBySeat.map((player) => {
                    const bid = round.bids[player.id];
                    const score = round.roundScores[player.id];
                    return (
                      <td key={player.id} className="whitespace-nowrap px-3 py-2 text-center font-mono">
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
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold text-cream">
                  Total
                </th>
                {sortedBySeat.map((player) => {
                  const total = totals[player.id] ?? 0;
                  const isLeader = leadScore > 0 && total === leadScore;
                  return (
                    <td
                      key={player.id}
                      className={`whitespace-nowrap px-3 py-2 text-center font-mono text-sm font-bold ${
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
