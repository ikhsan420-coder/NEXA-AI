import { useCallback, useEffect, useRef, useState } from 'react';
import type { Conversation, Message } from '../types';
import { ApiError, streamChat } from '../lib/api';
import { clearAllChats, loadActiveId, loadConversations, saveActiveId, saveConversations } from '../lib/storage';
import { uid } from '../lib/utils';
import { preloadHighlighter } from '../lib/highlight';

const MAX_HISTORY_MESSAGES = 40;
const MAX_HISTORY_CHARS = 100_000;
const DEFAULT_TITLE = 'New chat';

function trimHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m.content.trim()) continue; // skip failed/empty assistant turns
    if (out.length >= MAX_HISTORY_MESSAGES || total + m.content.length > MAX_HISTORY_CHARS) break;
    total += m.content.length;
    out.unshift({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

const makeTitle = (text: string) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 42 ? `${t.slice(0, 42).trimEnd()}…` : t || DEFAULT_TITLE;
};

export interface ChatStore {
  conversations: Conversation[];
  active: Conversation | null;
  activeId: string | null;
  generating: boolean;
  newChat: () => void;
  selectChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  clearAll: () => void;
  send: (text: string) => void;
  regenerate: () => void;
  stop: () => void;
}

interface Options {
  model: string;
  customInstructions: string;
}

export function useChatStore({ model, customInstructions }: Options): ChatStore {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const id = loadActiveId();
    return id && loadConversations().some((c) => c.id === id) ? id : null;
  });
  const [generating, setGenerating] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const optsRef = useRef<Options>({ model, customInstructions });
  optsRef.current = { model, customInstructions };

  // ---- persistence (debounced; flushed on tab hide) ----
  useEffect(() => {
    const id = window.setTimeout(() => saveConversations(conversations), 400);
    return () => window.clearTimeout(id);
  }, [conversations]);
  useEffect(() => saveActiveId(activeId), [activeId]);
  useEffect(() => {
    const flush = () => saveConversations(convRef.current);
    const onVis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const patchConversation = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const patchMessage = useCallback(
    (convId: string, msgId: string, fn: (m: Message) => Message) => {
      patchConversation(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) }));
    },
    [patchConversation],
  );

  const run = useCallback(
    async (convId: string, history: Message[]) => {
      const assistantId = uid();
      const usedModel = optsRef.current.model || undefined;
      const placeholder: Message = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now(), model: usedModel };
      patchConversation(convId, (c) => ({ ...c, messages: [...c.messages, placeholder], updatedAt: Date.now() }));

      const controller = new AbortController();
      abortRef.current = controller;
      setGenerating(true);
      preloadHighlighter();

      // Coalesce rapid chunks into one state update per animation frame.
      let pending = '';
      let raf = 0;
      const flush = () => {
        raf = 0;
        if (!pending) return;
        const chunk = pending;
        pending = '';
        patchMessage(convId, assistantId, (m) => ({ ...m, content: m.content + chunk }));
      };

      try {
        await streamChat(
          {
            messages: trimHistory(history),
            model: usedModel,
            customInstructions: optsRef.current.customInstructions || undefined,
          },
          (delta) => {
            pending += delta;
            if (!raf) raf = requestAnimationFrame(flush);
          },
          controller.signal,
        );
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          const msg = e instanceof ApiError ? e.message : 'Something went wrong. Please try again.';
          if (raf) cancelAnimationFrame(raf);
          flush();
          patchMessage(convId, assistantId, (m) => ({ ...m, error: msg }));
        }
      } finally {
        if (raf) cancelAnimationFrame(raf);
        flush();
        if (abortRef.current === controller) abortRef.current = null;
        setGenerating(false);
        patchConversation(convId, (c) => ({ ...c, updatedAt: Date.now() }));
      }
    },
    [patchConversation, patchMessage],
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null); // a conversation is only created once the first message is sent
  }, []);

  const selectChat = useCallback((id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
  }, []);

  const renameChat = useCallback(
    (id: string, title: string) => {
      const t = title.trim().slice(0, 80);
      if (t) patchConversation(id, (c) => ({ ...c, title: t }));
    },
    [patchConversation],
  );

  const deleteChat = useCallback(
    (id: string) => {
      if (id === activeId) abortRef.current?.abort();
      setConversations((list) => list.filter((c) => c.id !== id));
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [activeId],
  );

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    clearAllChats();
    setConversations([]);
    setActiveId(null);
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || abortRef.current) return;
      const userMsg: Message = { id: uid(), role: 'user', content, createdAt: Date.now() };

      let convId = activeId;
      let history: Message[];
      const existing = convId ? convRef.current.find((c) => c.id === convId) : undefined;
      if (existing) {
        history = [...existing.messages, userMsg];
        patchConversation(existing.id, (c) => ({
          ...c,
          title: c.messages.length === 0 && c.title === DEFAULT_TITLE ? makeTitle(content) : c.title,
          messages: [...c.messages, userMsg],
          updatedAt: Date.now(),
        }));
      } else {
        convId = uid();
        history = [userMsg];
        const conv: Conversation = { id: convId, title: makeTitle(content), createdAt: Date.now(), updatedAt: Date.now(), messages: [userMsg] };
        setConversations((list) => [conv, ...list]);
        setActiveId(convId);
      }
      void run(convId!, history);
    },
    [activeId, patchConversation, run],
  );

  const regenerate = useCallback(() => {
    if (!activeId || abortRef.current) return;
    const conv = convRef.current.find((c) => c.id === activeId);
    if (!conv) return;
    const msgs = [...conv.messages];
    while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
    if (!msgs.length) return;
    patchConversation(activeId, (c) => ({ ...c, messages: msgs }));
    void run(activeId, msgs);
  }, [activeId, patchConversation, run]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return { conversations, active, activeId, generating, newChat, selectChat, renameChat, deleteChat, clearAll, send, regenerate, stop };
}
