export type Role = 'user' | 'assistant';
export type ThemeMode = 'dark' | 'light';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  model?: string;
  /** Set when generation failed; the (possibly partial) content is kept. */
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface Settings {
  theme: ThemeMode;
  /** Selected model ID (must come from the backend's live model list). */
  model: string;
  customInstructions: string;
  /** Optional backend URL, used by the Android app / PWA when the API is on another host. */
  serverUrl: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
  context_window?: number;
}
