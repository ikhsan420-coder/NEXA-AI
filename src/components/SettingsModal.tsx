import { useEffect, useState } from 'react';
import { Check, Info, Moon, RefreshCw, Server, Sparkles, Sun, Trash2, X } from 'lucide-react';
import type { ModelInfo, Settings } from '../types';
import { ModelSelector } from './ModelSelector';
import { Logo } from './Logo';
import { cn } from '../lib/utils';

interface Props {
  settings: Settings;
  models: ModelInfo[];
  modelsLoading: boolean;
  modelsError: string | null;
  chatCount: number;
  onChange: (patch: Partial<Settings>) => void;
  onRetryModels: () => void;
  onClearHistory: () => void;
  onClose: () => void;
  checkStatus: string;
  checkMessage: string;
  onCheckUpdate: () => void;
  onShowWhatsNew: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsModal({ settings, models, modelsLoading, modelsError, chatCount, onChange, onRetryModels, onClearHistory, onClose, checkStatus, checkMessage, onCheckUpdate, onShowWhatsNew }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [serverDraft, setServerDraft] = useState(settings.serverUrl);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const serverInvalid = serverDraft.trim() !== '' && !/^https?:\/\/[^\s/]+/i.test(serverDraft.trim());

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div
        className="glass animate-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-xl4 sm:rounded-xl4"
        style={{ background: 'var(--panel-solid)', paddingBottom: 'var(--safe-bottom)' }}
      >
        <header className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
          <button className="glass-btn !rounded-full !px-0" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-7 overflow-y-auto px-5 pb-6 pt-2">
          <Section title="Appearance">
            <div className="grid grid-cols-2 gap-2 rounded-xl3 bg-[var(--glass-bg)] p-1.5">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onChange({ theme: t })}
                  aria-pressed={settings.theme === t}
                  className={cn(
                    'flex min-h-[44px] items-center justify-center gap-2 rounded-xl2 text-sm font-medium transition-all',
                    settings.theme === t ? 'bg-gradient-to-br from-accent to-accent2 text-white shadow-lg' : 'text-muted hover:text-fg',
                  )}
                >
                  {t === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  {t === 'dark' ? 'Dark' : 'Light'}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Model">
            <ModelSelector
              models={models}
              value={settings.model}
              loading={modelsLoading}
              error={modelsError}
              onChange={(id) => onChange({ model: id })}
              onRetry={onRetryModels}
            />
            <p className="text-xs text-muted">Models are loaded live from your backend, so the list always matches what your Groq account can use.</p>
          </Section>

          <Section title="Custom instructions">
            <textarea
              className="glass-input min-h-[88px] resize-y text-sm"
              placeholder="Optional: how should NEXA respond? (tone, language, level of detail…)"
              value={settings.customInstructions}
              maxLength={1500}
              onChange={(e) => onChange({ customInstructions: e.target.value })}
            />
          </Section>

          <Section title="Server">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-muted" htmlFor="server-url">
                <Server size={15} /> Backend URL <span className="text-xs">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="server-url"
                  className={cn('glass-input text-sm', serverInvalid && '!border-danger')}
                  placeholder="https://your-backend.example.com"
                  value={serverDraft}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setServerDraft(e.target.value)}
                />
                <button
                  className="glass-btn flex-none"
                  disabled={serverInvalid || serverDraft.trim() === settings.serverUrl}
                  onClick={() => onChange({ serverUrl: serverDraft.trim().replace(/\/+$/, '') })}
                >
                  <Check size={16} /> Save
                </button>
              </div>
              <p className="text-xs text-muted">Leave empty when the app is served by the backend itself. The Android app needs this (or a build-time VITE_API_BASE_URL). The API key never leaves the server.</p>
            </div>
          </Section>

          <Section title="Data">
            {confirmClear ? (
              <div className="space-y-3 rounded-xl3 border border-danger/30 bg-danger/10 p-4">
                <p className="text-sm">
                  Delete all {chatCount} conversation{chatCount === 1 ? '' : 's'} from this device? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button className="glass-btn flex-1" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                  <button
                    className="glass-btn danger flex-1 font-semibold"
                    onClick={() => {
                      onClearHistory();
                      setConfirmClear(false);
                    }}
                  >
                    <Trash2 size={16} /> Delete all
                  </button>
                </div>
              </div>
            ) : (
              <button className="glass-btn danger w-full justify-start" disabled={chatCount === 0} onClick={() => setConfirmClear(true)}>
                <Trash2 size={16} /> Clear chat history ({chatCount})
              </button>
            )}
          </Section>

          <Section title="About">
            <div className="flex items-center gap-4 rounded-xl3 bg-[var(--glass-bg)] p-4">
              <Logo size={52} />
              <div className="min-w-0 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  NEXA AI <Info size={14} className="text-muted" />
                </div>
                <div className="text-muted">Version {__APP_VERSION__}</div>
                <div className="truncate text-xs text-muted">com.nexaai.assistant · Powered by Groq</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="glass-btn flex-1" onClick={onCheckUpdate} disabled={checkStatus === 'checking'}>
                <RefreshCw size={15} className={checkStatus === 'checking' ? 'animate-spin' : ''} /> Check for updates
              </button>
              <button className="glass-btn flex-1" onClick={onShowWhatsNew}>
                <Sparkles size={15} /> What's new
              </button>
            </div>
            {checkMessage && (
              <p className="text-sm text-muted" role="status">
                {checkMessage}
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
