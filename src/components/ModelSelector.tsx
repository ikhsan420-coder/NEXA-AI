import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Cpu, Loader2, RefreshCw } from 'lucide-react';
import type { ModelInfo } from '../types';
import { cn } from '../lib/utils';

interface Props {
  models: ModelInfo[];
  value: string;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  onChange: (id: string) => void;
  onRetry: () => void;
  /** Open the menu above the trigger (used in tight layouts). */
  align?: 'left' | 'right';
}

export function ModelSelector({ models, value, loading, error, disabled, onChange, onRetry, align = 'left' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = loading ? 'Loading models…' : error ? 'Models unavailable' : value || 'Select model';

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        className="glass-btn max-w-full !min-h-[40px] gap-2 !px-3 text-sm"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select model"
      >
        {loading ? <Loader2 size={15} className="flex-none animate-spin" /> : <Cpu size={15} className="flex-none text-accent2" />}
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className={cn('flex-none text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'glass glass-strong animate-pop absolute top-[calc(100%+8px)] z-50 max-h-[min(60vh,420px)] w-[min(86vw,340px)] overflow-y-auto rounded-xl3 p-1.5',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          style={{ background: 'var(--panel-solid)' }}
        >
          {error ? (
            <div className="space-y-3 p-3 text-sm">
              <p className="text-danger">{error}</p>
              <button className="glass-btn !min-h-[40px] w-full" onClick={onRetry}>
                <RefreshCw size={15} /> Retry
              </button>
            </div>
          ) : (
            models.map((m) => {
              const selected = m.id === value;
              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-3 rounded-xl2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--glass-bg-hover)]',
                    selected && 'bg-[var(--glass-bg-strong)]',
                  )}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.id}</span>
                    <span className="block truncate text-xs text-muted">
                      {[m.owned_by, m.context_window ? `${Math.round(m.context_window / 1000)}K context` : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {selected && <Check size={16} className="flex-none text-accent2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
