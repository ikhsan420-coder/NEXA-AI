import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';

interface Props {
  generating: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onAttach: () => void;
}

const MAX_CHARS = 12000;

export function InputBar({ generating, disabled, onSend, onStop, onAttach }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  // auto-resize
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (!generating && window.matchMedia('(pointer:fine)').matches) ref.current?.focus();
  }, [generating]);

  const canSend = value.trim().length > 0 && !generating && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue('');
  };

  return (
    <div className="relative z-10 px-3 pb-3 pt-1 sm:px-6" style={{ paddingBottom: 'calc(0.75rem + var(--safe-bottom))' }}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="glass rounded-xl4 p-2 transition-shadow focus-within:shadow-[0_0_0_1px_rgb(var(--c-accent)/0.55),0_0_32px_-6px_rgb(var(--c-accent)/0.45)]">
          <div className="flex items-end gap-1.5">
            <button className="glass-btn !rounded-full !px-0" onClick={onAttach} aria-label="Attach file (coming soon)" title="Attachments (coming soon)">
              <Paperclip size={19} />
            </button>

            <textarea
              ref={ref}
              rows={1}
              value={value}
              maxLength={MAX_CHARS}
              onChange={(e) => setValue(e.target.value)}
              onCompositionStart={() => (composing.current = true)}
              onCompositionEnd={() => (composing.current = false)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter inserts a newline. Ignore Enter while an IME is composing.
                if (e.key === 'Enter' && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={generating ? 'NEXA is responding…' : 'Message NEXA AI'}
              disabled={generating || disabled}
              aria-label="Message"
              enterKeyHint="send"
              className="max-h-[200px] min-h-[44px] flex-1 resize-none self-center bg-transparent px-2 py-2.5 text-[1rem] leading-6 outline-none placeholder:text-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {generating ? (
              <button className="glass-btn primary !rounded-full !px-0" onClick={onStop} aria-label="Stop generating" title="Stop">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button className="glass-btn primary !rounded-full !px-0" onClick={submit} disabled={!canSend} aria-label="Send message" title="Send">
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[0.7rem] text-muted/80">NEXA AI can make mistakes. Check important information.</p>
      </div>
    </div>
  );
}
