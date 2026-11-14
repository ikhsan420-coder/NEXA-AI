import { Sparkles } from 'lucide-react';
import type { ChangelogEntry } from '../lib/version';
import { Logo } from './Logo';

export function WhatsNewDialog({ entries, onClose }: { entries: ChangelogEntry[]; onClose: () => void }) {
  if (entries.length === 0) return null;
  const latest = entries[0];
  return (
    <div className="fixed inset-0 z-[76] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="What's new">
      <div className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div
        className="glass animate-sheet relative flex max-h-[88dvh] w-full max-w-sm flex-col rounded-xl4 p-5"
        style={{ background: 'var(--panel-solid)', marginBottom: 'var(--safe-bottom)' }}
      >
        <div className="mb-4 flex items-center gap-3">
          <Logo size={44} />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-lg font-semibold leading-tight">
              <Sparkles size={17} className="text-accent2" /> What's new
            </h2>
            <p className="truncate text-sm text-muted">NEXA AI {latest.version} is installed.</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {entries.map((e) => (
            <section key={e.version}>
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                <h3 className="font-semibold">{e.title}</h3>
                <span className="text-xs text-muted">
                  v{e.version} · {e.date}
                </span>
              </div>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-accent">
                {e.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <button className="glass-btn primary mt-5 w-full font-semibold" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
