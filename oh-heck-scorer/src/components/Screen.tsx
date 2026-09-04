import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { InstallPrompt } from './InstallPrompt';

export function Screen({
  subtitle,
  children,
  footer,
}: {
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader subtitle={subtitle} />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-3 py-3 safe-bottom">
        {children}
        {footer && <footer className="mt-auto pt-4 text-center">{footer}</footer>}
      </main>

      <InstallPrompt />
    </div>
  );
}
