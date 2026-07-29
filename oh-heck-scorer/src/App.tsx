import { useRegisterSW } from 'virtual:pwa-register/react'

function InstallPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-sm rounded-xl border border-gold/30 bg-felt-dark/95 p-4 shadow-lg backdrop-blur-sm"
    >
      <p className="text-sm text-cream/90">A new version is available.</p>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="mt-3 min-h-11 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-felt-dark active:scale-[0.98] transition-transform"
      >
        Reload to update
      </button>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
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
              <h1 className="text-base font-semibold leading-tight text-cream">
                Oh Heck Scorer
              </h1>
              <p className="text-xs text-cream/60">Multiplayer scoring</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 safe-bottom">
        <section className="flex flex-1 flex-col justify-center gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-cream">
              Game night, synced
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-cream/70">
              Host a room, share a code, and keep everyone on the same live
              scoreboard — on iPhone or Android.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="min-h-14 w-full rounded-xl bg-gold px-6 py-3.5 text-base font-semibold text-felt-dark shadow-md active:scale-[0.98] transition-transform"
            >
              Create game
            </button>
            <button
              type="button"
              className="min-h-14 w-full rounded-xl border-2 border-felt-light bg-felt/40 px-6 py-3.5 text-base font-semibold text-cream active:scale-[0.98] transition-transform"
            >
              Join with code
            </button>
          </div>
        </section>

        <footer className="mt-auto pt-8 text-center">
          <p className="text-xs text-cream/40">
            Install this app from your browser menu for the best experience.
          </p>
        </footer>
      </main>

      <InstallPrompt />
    </div>
  )
}
