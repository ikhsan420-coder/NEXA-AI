import { Code2, Lightbulb, PenLine, Terminal } from 'lucide-react';
import { Logo } from './Logo';

const SUGGESTIONS = [
  { icon: Code2, title: 'Write code', prompt: 'Write a Python function that validates an email address, with a few test cases.' },
  { icon: Terminal, title: 'Roblox scripting', prompt: 'Write a Luau script for Roblox that makes a part change color when a player touches it.' },
  { icon: Lightbulb, title: 'Explain simply', prompt: 'Explain how HTTPS works in simple terms, with a short step-by-step list.' },
  { icon: PenLine, title: 'Draft a message', prompt: 'Help me write a polite email asking my team for a project status update.' },
];

export function Welcome({ onPick, disabled }: { onPick: (prompt: string) => void; disabled: boolean }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 animate-fade-up drop-shadow-[0_12px_40px_rgba(99,102,241,0.55)]">
        <Logo size={72} />
      </div>
      <h1 className="animate-fade-up text-[1.9rem] font-semibold tracking-tight sm:text-4xl" style={{ animationDelay: '60ms' }}>
        What can I help you with?
      </h1>
      <p className="mt-2 animate-fade-up text-base text-muted sm:text-lg" style={{ animationDelay: '120ms' }}>
        Your intelligent AI assistant.
      </p>

      <div className="mt-9 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, title, prompt }, i) => (
          <button
            key={title}
            disabled={disabled}
            onClick={() => onPick(prompt)}
            className="glass group animate-fade-up rounded-xl3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--glass-bg-hover)] active:scale-[0.98] disabled:opacity-50"
            style={{ animationDelay: `${180 + i * 70}ms` }}
          >
            <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent/30 to-accent2/25 text-accent2 transition-transform group-hover:scale-110">
              <Icon size={18} />
            </span>
            <span className="block text-sm font-semibold">{title}</span>
            <span className="mt-1 line-clamp-2 block text-[0.82rem] leading-snug text-muted">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
