import { memo, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, RefreshCw } from 'lucide-react';
import type { Message } from '../types';
import { Markdown } from './Markdown';
import { Logo } from './Logo';
import { copyText, stripThinking } from '../lib/utils';

interface Props {
  message: Message;
  streaming: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}

function TypingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm text-muted" role="status" aria-label={label}>
      <span className="flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      <span>{label}</span>
    </div>
  );
}

function MessageItemImpl({ message, streaming, canRegenerate, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div
          className="glass max-w-[88%] whitespace-pre-wrap break-words rounded-xl3 rounded-br-lg px-4 py-3 text-[0.97rem] leading-relaxed sm:max-w-[78%]"
          style={{ background: 'var(--user-bubble)' }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const { visible, thinking } = stripThinking(message.content);
  const waiting = streaming && !visible.trim();

  const onCopy = async () => {
    if (await copyText(visible)) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="flex min-w-0 gap-3 animate-fade-up">
      <div className="mt-0.5 flex-none">
        <Logo size={32} />
      </div>
      <div className="min-w-0 flex-1">
        {waiting ? <TypingDots label={thinking ? 'Thinking…' : 'NEXA is thinking…'} /> : <Markdown content={visible} />}
        {streaming && !waiting && <span className="caret" aria-hidden />}

        {message.error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl2 border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm" role="alert">
            <AlertTriangle size={17} className="mt-0.5 flex-none text-danger" />
            <div className="min-w-0 flex-1">
              <p className="break-words">{message.error}</p>
              {canRegenerate && (
                <button className="mt-2 inline-flex items-center gap-1.5 font-medium text-accent2 hover:underline" onClick={onRegenerate}>
                  <RefreshCw size={14} /> Try again
                </button>
              )}
            </div>
          </div>
        )}

        {!streaming && visible.trim() && (
          <div className="mt-2 flex items-center gap-1 text-muted">
            <button className="glass-btn !min-h-[36px] !min-w-[36px] !rounded-xl !px-2.5 text-xs" onClick={onCopy} aria-label="Copy response" title="Copy response">
              {copied ? <Check size={15} className="text-accent2" /> : <Copy size={15} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {canRegenerate && (
              <button className="glass-btn !min-h-[36px] !min-w-[36px] !rounded-xl !px-2.5 text-xs" onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response">
                <RefreshCw size={15} />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            )}
            {message.model && <span className="ml-2 hidden truncate text-[0.7rem] opacity-70 sm:inline">{message.model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemImpl);
