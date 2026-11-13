import { useEffect } from 'react';

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(id);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ bottom: 'calc(110px + var(--safe-bottom))' }}
      role="status"
      aria-live="polite"
    >
      <div className="glass glass-strong animate-pop rounded-full px-4 py-2.5 text-sm shadow-xl">{message}</div>
    </div>
  );
}
