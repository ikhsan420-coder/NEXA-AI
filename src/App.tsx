import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import type { ModelInfo, Settings } from './types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './lib/storage';
import { fetchModels, setServerUrl } from './lib/api';
import { ThemeContext } from './lib/theme';
import { useChatStore } from './store/useChatStore';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';
import { MessageItem } from './components/MessageItem';
import { InputBar } from './components/InputBar';
import { ModelSelector } from './components/ModelSelector';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { UpdateDialog } from './components/UpdateDialog';
import { WhatsNewDialog } from './components/WhatsNewDialog';
import { useUpdater } from './store/useUpdater';
import { CHANGELOG, CURRENT_VERSION, markVersionSeen, pendingWhatsNew } from './lib/changelog';
import type { ChangelogEntry } from './lib/version';

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings();
    setServerUrl(s.serverUrl); // must be set before the first request
    return s;
  });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [whatsNew, setWhatsNew] = useState<ChangelogEntry[]>(() => pendingWhatsNew());
  const updater = useUpdater(CURRENT_VERSION, whatsNew.length === 0);
  const closeWhatsNew = () => {
    markVersionSeen();
    setWhatsNew([]);
  };

  const chat = useChatStore({ model: settings.model, customInstructions: settings.customInstructions });
  const { active, generating } = chat;

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.serverUrl !== undefined) setServerUrl(next.serverUrl);
      saveSettings(next);
      return next;
    });
  }, []);

  // ---- theme ----
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', settings.theme === 'light');
    root.style.colorScheme = settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'light' ? '#F0F3FA' : '#080A10');
  }, [settings.theme]);

  // ---- models (live from backend) ----
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetchModels();
      setModels(res.models);
      const cur = settingsRef.current.model;
      if (!cur || !res.models.some((m) => m.id === cur)) {
        const fallback = res.default ?? res.models[0]?.id ?? '';
        if (fallback) updateSettings({ model: fallback });
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setModelsError((e as Error).message || 'Could not load models.');
    } finally {
      setModelsLoading(false);
    }
  }, [updateSettings]);

  useEffect(() => {
    void loadModels();
  }, [loadModels, settings.serverUrl]);

  // ---- auto-scroll (only while the user is near the bottom) ----
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };
  const lastMsg = active?.messages[active.messages.length - 1];
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lastMsg?.content, lastMsg?.id, active?.messages.length]);
  useEffect(() => {
    stick.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.activeId]);

  const onSend = (text: string) => {
    stick.current = true;
    chat.send(text);
  };

  const messages = active?.messages ?? [];
  const lastIndex = messages.length - 1;

  return (
    <ThemeContext.Provider value={settings.theme}>
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>

      <div className="h-app relative z-10 flex overflow-hidden">
        <Sidebar
          conversations={chat.conversations}
          activeId={chat.activeId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNew={chat.newChat}
          onSelect={chat.selectChat}
          onRename={chat.renameChat}
          onDelete={chat.deleteChat}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <header
            className="relative z-20 flex items-center gap-2 px-3 pb-2 sm:px-5"
            style={{ paddingTop: 'calc(0.6rem + var(--safe-top))', paddingRight: 'calc(0.75rem + var(--safe-right))' }}
          >
            <button className="glass-btn !rounded-full !px-0 md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={20} />
            </button>
            <ModelSelector
              models={models}
              value={settings.model}
              loading={modelsLoading}
              error={modelsError}
              disabled={generating}
              onChange={(id) => updateSettings({ model: id })}
              onRetry={loadModels}
            />
            <div className="min-w-0 flex-1 truncate px-1 text-center text-sm text-muted md:hidden">{active?.title}</div>
            <button className="glass-btn !rounded-full !px-0 md:hidden" onClick={chat.newChat} aria-label="New chat">
              <Plus size={20} />
            </button>
          </header>

          <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingRight: 'var(--safe-right)' }}>
            {messages.length === 0 ? (
              <Welcome onPick={onSend} disabled={generating} />
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-7 px-4 pb-6 pt-4 sm:px-6">
                {messages.map((m, i) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    streaming={generating && i === lastIndex && m.role === 'assistant'}
                    canRegenerate={!generating && i === lastIndex && m.role === 'assistant'}
                    onRegenerate={chat.regenerate}
                  />
                ))}
              </div>
            )}
          </div>

          <InputBar generating={generating} onSend={onSend} onStop={chat.stop} onAttach={() => setToast('Attachments are coming soon.')} />
        </main>
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          chatCount={chat.conversations.length}
          onChange={updateSettings}
          onRetryModels={loadModels}
          onClearHistory={() => {
            chat.clearAll();
            setToast('Chat history cleared.');
          }}
          onClose={() => setSettingsOpen(false)}
          checkStatus={updater.checkStatus}
          checkMessage={updater.checkMessage}
          onCheckUpdate={() => void updater.checkNow()}
          onShowWhatsNew={() => setWhatsNew(CHANGELOG.slice(0, 3))}
        />
      )}
      {whatsNew.length === 0 && <UpdateDialog updater={updater} />}
      <WhatsNewDialog entries={whatsNew} onClose={closeWhatsNew} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </ThemeContext.Provider>
  );
}

export { DEFAULT_SETTINGS };
