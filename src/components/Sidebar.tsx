import { useMemo, useRef, useState } from 'react';
import { Check, MessageSquare, Pencil, Plus, Search, Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import type { Conversation } from '../types';
import { Logo } from './Logo';
import { cn, groupLabel } from '../lib/utils';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ conversations, activeId, open, onClose, onNew, onSelect, onRename, onDelete, onOpenSettings }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
    const map = new Map<string, Conversation[]>();
    for (const c of list) {
      const k = groupLabel(c.updatedAt);
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return [...map.entries()];
  }, [conversations, query]);

  const commitRename = () => {
    if (editingId) onRename(editingId, draft);
    setEditingId(null);
  };

  const pick = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      {/* backdrop (mobile drawer only) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'glass fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col rounded-r-xl4 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
          'md:static md:z-10 md:m-3 md:mr-0 md:w-[290px] md:max-w-none md:translate-x-0 md:rounded-xl4',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
          paddingLeft: 'var(--safe-left)',
        }}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="text-[1.05rem] font-semibold tracking-tight">
              NEXA <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">AI</span>
            </span>
          </div>
          <button className="glass-btn md:hidden" onClick={onClose} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2.5 px-3 pb-2 pt-2">
          <button
            className="glass-btn primary w-full justify-start font-medium"
            onClick={() => {
              onNew();
              onClose();
            }}
          >
            <Plus size={18} /> New chat
          </button>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              className="glass-input !pl-10 !pr-9 text-sm"
              placeholder="Search chats"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search chats"
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-fg"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Chat history">
          {groups.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">{query ? 'No chats match your search.' : 'Your conversations will appear here.'}</p>
          )}
          {groups.map(([label, items]) => (
            <div key={label} className="mb-2">
              <div className="px-3 pb-1 pt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{label}</div>
              {items.map((c) => {
                const isActive = c.id === activeId;
                const editing = editingId === c.id;
                const confirming = confirmId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'group relative mb-0.5 flex min-h-[44px] items-center rounded-xl2 border transition-colors',
                      isActive ? 'border-[var(--glass-border)] bg-[var(--glass-bg-strong)]' : 'border-transparent hover:bg-[var(--glass-bg)]',
                    )}
                  >
                    {editing ? (
                      <form
                        className="flex w-full items-center gap-1 px-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          commitRename();
                        }}
                      >
                        <input
                          autoFocus
                          className="glass-input !min-h-[36px] !rounded-xl !px-2.5 !py-1 text-sm"
                          value={draft}
                          maxLength={80}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                          aria-label="Chat title"
                        />
                      </form>
                    ) : (
                      <>
                        <button className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left" onClick={() => pick(c.id)}>
                          <MessageSquare size={15} className="flex-none text-muted" />
                          <span className="truncate text-sm">{c.title}</span>
                        </button>
                        <div
                          className={cn(
                            'flex flex-none items-center pr-1.5 transition-opacity',
                            confirming ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
                          )}
                        >
                          {confirming ? (
                            <>
                              <button
                                className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-[var(--glass-bg-hover)]"
                                onClick={() => {
                                  onDelete(c.id);
                                  setConfirmId(null);
                                }}
                                aria-label="Confirm delete"
                              >
                                <Check size={16} />
                              </button>
                              <button className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[var(--glass-bg-hover)]" onClick={() => setConfirmId(null)} aria-label="Cancel delete">
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[var(--glass-bg-hover)] hover:text-fg"
                                onClick={() => {
                                  setEditingId(c.id);
                                  setDraft(c.title);
                                }}
                                aria-label={`Rename ${c.title}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[var(--glass-bg-hover)] hover:text-danger"
                                onClick={() => setConfirmId(c.id)}
                                aria-label={`Delete ${c.title}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--glass-border-soft)] p-3">
          <button
            className="flex w-full items-center gap-3 rounded-xl2 p-2 text-left transition-colors hover:bg-[var(--glass-bg)]"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gradient-to-br from-accent to-accent2 text-sm font-semibold text-white shadow-lg">
              U
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">You</span>
              <span className="block truncate text-xs text-muted">Local profile · stored on this device</span>
            </span>
            <SettingsIcon size={18} className="flex-none text-muted" />
          </button>
        </div>
      </aside>
    </>
  );
}
