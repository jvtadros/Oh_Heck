export function AppHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-felt-light/40 bg-felt-dark/90 px-4 py-3 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-felt text-lg font-bold text-gold shadow-inner"
            aria-hidden="true"
          >
            ♠
          </span>
          <div>
            <h1 className="text-base font-semibold leading-tight text-cream">Oh Heck Scorer</h1>
            <p className="text-xs text-cream/60">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
