export function RoundHeader({
  roundNumber,
  totalRounds,
  cardsDealt,
  dealerName,
}: {
  roundNumber: number;
  totalRounds: number;
  cardsDealt: number;
  dealerName: string;
}) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-felt/40 p-5 text-center">
      <p className="text-xs uppercase tracking-widest text-cream/60">
        Round {roundNumber} of {totalRounds}
      </p>
      <p className="mt-1 text-2xl font-bold text-gold">
        {cardsDealt} card{cardsDealt === 1 ? '' : 's'}
      </p>
      <p className="mt-1 text-sm text-cream/70">Dealer: {dealerName}</p>
    </div>
  );
}
