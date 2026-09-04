import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function PrimaryButton({
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`min-h-12 w-full rounded-xl bg-gold px-5 py-3 text-base font-semibold text-felt-dark shadow-md transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
    />
  );
}

export function SecondaryButton({
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`min-h-12 w-full rounded-xl border-2 border-felt-light bg-felt/40 px-5 py-3 text-base font-semibold text-cream transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${className}`}
    />
  );
}

export function TextField({
  label,
  id,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : label.toLowerCase().replace(/\s+/g, '-'));
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-cream/80">{label}</span>
      <input
        id={inputId}
        {...props}
        className={`min-h-12 rounded-lg border-2 border-felt-light bg-felt-dark/60 px-4 text-base text-cream outline-none placeholder:text-cream/40 focus:border-gold ${className}`}
      />
    </label>
  );
}

export function StepperButton({
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-felt-light bg-felt-dark/60 text-lg font-bold text-cream transition-transform active:scale-90 disabled:opacity-30 disabled:active:scale-100 ${className}`}
    />
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
      {children}
    </p>
  );
}
