import { AlertTriangle, ArrowDownToLine, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { Updater } from '../store/useUpdater';
import { Markdown } from './Markdown';
import { Logo } from './Logo';

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-md" />
      <div
        className="glass animate-sheet relative max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-xl4 p-5"
        style={{ background: 'var(--panel-solid)', marginBottom: 'var(--safe-bottom)' }}
      >
        {children}
      </div>
    </div>
  );
}

export function UpdateDialog({ updater }: { updater: Updater }) {
  const { phase, info, received, total, error } = updater;
  if (phase === 'idle') return null;

  if (phase === 'web-ready') {
    return (
      <Shell label="Update ready">
        <div className="mb-3 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <h2 className="text-lg font-semibold leading-tight">New version ready</h2>
            <p className="text-sm text-muted">Reload to start using the latest NEXA AI.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="glass-btn flex-1" onClick={updater.dismiss}>
            Later
          </button>
          <button className="glass-btn primary flex-1 font-semibold" onClick={updater.reloadWeb}>
            <RefreshCw size={16} /> Reload now
          </button>
        </div>
      </Shell>
    );
  }

  const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0;

  return (
    <Shell label="Update available">
      <div className="mb-3 flex items-center gap-3">
        <Logo size={44} />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">
            {phase === 'permission' ? 'Allow updates' : phase === 'error' ? 'Update problem' : 'Update available'}
          </h2>
          {info && (
            <p className="truncate text-sm text-muted">
              NEXA AI <span className="font-medium text-fg">{info.version}</span>
              {info.size > 0 && <> · {mb(info.size)}</>}
            </p>
          )}
        </div>
      </div>

      {phase === 'available' && info && (
        <>
          {info.notes && (
            <div className="mb-4 max-h-56 overflow-y-auto rounded-xl3 bg-[var(--glass-bg)] p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <Sparkles size={13} /> What's new
              </div>
              <Markdown content={info.notes} />
            </div>
          )}
          <p className="mb-4 text-sm text-muted">Download and install the update now?</p>
          <div className="flex gap-2">
            <button className="glass-btn flex-1" onClick={updater.dismiss}>
              Later
            </button>
            <button className="glass-btn primary flex-1 font-semibold" onClick={() => void updater.startUpdate()}>
              <ArrowDownToLine size={16} /> Update now
            </button>
          </div>
        </>
      )}

      {phase === 'permission' && (
        <>
          <div className="mb-4 flex gap-3 rounded-xl3 bg-[var(--glass-bg)] p-3 text-sm">
            <ShieldCheck size={20} className="mt-0.5 flex-none text-accent2" />
            <p>
              To install updates, Android needs your permission. Tap <b>Open settings</b>, switch on <b>Allow from this source</b>, then come back. The update will continue
              automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="glass-btn flex-1" onClick={updater.dismiss}>
              Not now
            </button>
            <button className="glass-btn primary flex-1 font-semibold" onClick={updater.openSettings}>
              Open settings
            </button>
          </div>
        </>
      )}

      {phase === 'downloading' && (
        <div aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <Loader2 size={15} className="animate-spin" /> Downloading…
            </span>
            <span className="font-medium tabular-nums">{total > 0 ? `${pct}%` : mb(received)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--glass-bg-strong)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-[width] duration-200" style={{ width: `${total > 0 ? pct : 8}%` }} />
          </div>
          {total > 0 && (
            <p className="mt-2 text-xs text-muted tabular-nums">
              {mb(received)} of {mb(total)}
            </p>
          )}
          <p className="mt-3 text-xs text-muted">Keep NEXA AI open until the download finishes.</p>
        </div>
      )}

      {phase === 'installing' && (
        <>
          <div className="mb-4 flex gap-3 rounded-xl3 bg-[var(--glass-bg)] p-3 text-sm">
            <CheckCircle2 size={20} className="mt-0.5 flex-none text-accent2" />
            <p>
              Download complete. Tap <b>Install</b> on the Android screen. NEXA AI will close while it updates; just open it again afterwards.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="glass-btn flex-1" onClick={updater.dismiss}>
              Close
            </button>
            <button className="glass-btn primary flex-1 font-semibold" onClick={() => void updater.installAgain()}>
              Install again
            </button>
          </div>
        </>
      )}

      {phase === 'error' && (
        <>
          <div className="mb-4 flex gap-3 rounded-xl3 border border-danger/30 bg-danger/10 p-3 text-sm" role="alert">
            <AlertTriangle size={20} className="mt-0.5 flex-none text-danger" />
            <p className="break-words">{error}</p>
          </div>
          <div className="flex gap-2">
            <button className="glass-btn flex-1" onClick={updater.dismiss}>
              Close
            </button>
            <button className="glass-btn primary flex-1 font-semibold" onClick={() => void updater.startUpdate()}>
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        </>
      )}
    </Shell>
  );
}
