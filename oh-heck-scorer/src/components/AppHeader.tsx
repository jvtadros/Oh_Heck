export function AppHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-felt-light/40 bg-felt-dark/90 px-3 py-1.5 backdrop-blur-md safe-top">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-felt text-sm font-bold text-gold shadow-inner"
          aria-hidden="true"
        >
          ♠
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold leading-tight text-cream">
            Oh Heck Scorer
            <span className="font-normal text-cream/50"> · {subtitle}</span>
          </h1>
        </div>
      </div>
    </header>
  );
}
