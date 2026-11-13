import type { Conversation, Settings } from '../types';

const CONV_KEY = 'nexa.conversations.v1';
const ACTIVE_KEY = 'nexa.active.v1';
export const SETTINGS_KEY = 'nexa.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  model: '',
  customInstructions: '',
  serverUrl: '',
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the app keeps working in memory */
  }
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(SETTINGS_KEY) ?? {};
  return {
    theme: s.theme === 'light' ? 'light' : 'dark',
    model: typeof s.model === 'string' ? s.model : '',
    customInstructions: typeof s.customInstructions === 'string' ? s.customInstructions.slice(0, 1500) : '',
    serverUrl: typeof s.serverUrl === 'string' ? s.serverUrl : '',
  };
}

export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s);

export function loadConversations(): Conversation[] {
  const raw = read<unknown>(CONV_KEY);
  if (!Array.isArray(raw)) return [];
  const out: Conversation[] = [];
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue;
    const conv = c as Partial<Conversation>;
    if (typeof conv.id !== 'string' || !Array.isArray(conv.messages)) continue;
    out.push({
      id: conv.id,
      title: typeof conv.title === 'string' && conv.title ? conv.title : 'New chat',
      createdAt: Number(conv.createdAt) || Date.now(),
      updatedAt: Number(conv.updatedAt) || Date.now(),
      messages: conv.messages.filter(
        (m) => m && typeof m.id === 'string' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
      ),
    });
  }
  return out;
}

export const saveConversations = (list: Conversation[]) => write(CONV_KEY, list);

export const loadActiveId = (): string | null => read<string>(ACTIVE_KEY);
export const saveActiveId = (id: string | null) => write(ACTIVE_KEY, id);

export function clearAllChats(): void {
  try {
    localStorage.removeItem(CONV_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
