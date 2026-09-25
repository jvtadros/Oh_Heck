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
    <div className="rounded-xl border border-gold/30 bg-felt/40 px-3 py-2 text-center">
      <p className="text-[11px] uppercase tracking-wider text-cream/60">
        Round {roundNumber} of {totalRounds}
        <span className="mx-1.5 text-cream/30">·</span>
        <span className="font-semibold text-gold">
          {cardsDealt} card{cardsDealt === 1 ? '' : 's'}
        </span>
        <span className="mx-1.5 text-cream/30">·</span>
        Dealer {dealerName}
      </p>
    </div>
  );
}
