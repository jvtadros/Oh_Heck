import { useRegisterSW } from 'virtual:pwa-register/react';

export function InstallPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

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
  );
}
