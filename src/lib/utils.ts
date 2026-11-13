export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const cn = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(' ');

/** Copy text. Falls back to execCommand because navigator.clipboard needs HTTPS (not available on http://192.168.x.x). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Reasoning models may emit <think>...</think> before the answer.
 * Hide it from the visible answer (including an unfinished block while streaming).
 */
export function stripThinking(text: string): { visible: string; thinking: boolean } {
  let visible = text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  const open = visible.indexOf('<think>');
  if (open !== -1) {
    visible = visible.slice(0, open);
    return { visible, thinking: true };
  }
  return { visible, thinking: false };
}

export function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function groupLabel(ts: number, now = Date.now()): string {
  const day = 86_400_000;
  const startOfToday = new Date(new Date(now).toDateString()).getTime();
  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - day) return 'Yesterday';
  if (ts >= startOfToday - 7 * day) return 'Previous 7 days';
  if (ts >= startOfToday - 30 * day) return 'Previous 30 days';
  return 'Older';
}
