import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ThemedToken } from 'shiki/core';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { detectLanguage, fileNameFor, languageLabel, normalizeLanguage, PLAINTEXT } from '../lib/languages';
import { highlight } from '../lib/highlight';
import { useTheme } from '../lib/theme';
import { copyText } from '../lib/utils';
import { downloadTextFile } from '../lib/download';

interface Props {
  /** Raw fence info string, e.g. "ts", "language-python", "c++". May be empty. */
  language?: string;
  code: string;
}

// Shiki font-style bit flags
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

function tokenStyle(t: ThemedToken): React.CSSProperties | undefined {
  const s: React.CSSProperties = {};
  if (t.color) s.color = t.color;
  if (t.fontStyle) {
    if (t.fontStyle & ITALIC) s.fontStyle = 'italic';
    if (t.fontStyle & BOLD) s.fontWeight = 600;
    if (t.fontStyle & UNDERLINE) s.textDecoration = 'underline';
  }
  return Object.keys(s).length ? s : undefined;
}

function CodeBlockImpl({ language, code: rawCode }: Props) {
  const theme = useTheme();
  // Trailing newline from the markdown fence is not a real line.
  const code = useMemo(() => rawCode.replace(/\r\n?/g, '\n').replace(/\n$/, ''), [rawCode]);
  const explicit = normalizeLanguage(language);
  const lang = useMemo(() => explicit || detectLanguage(code) || PLAINTEXT, [explicit, code]);
  const label = languageLabel(lang, explicit ? undefined : language);

  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const copyTimer = useRef<number>(0);
  const saveTimer = useRef<number>(0);

  // Debounced so a streaming answer does not re-tokenise on every chunk.
  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      highlight(code, lang, theme).then((res) => {
        if (!cancelled) setTokens(res ? res.lines : null);
      });
    }, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [code, lang, theme]);

  useEffect(
    () => () => {
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(saveTimer.current);
    },
    [],
  );

  const rawLines = useMemo(() => code.split('\n'), [code]);
  const gutterWidth = `${Math.max(2, String(rawLines.length).length) + 1.6}ch`;

  const onCopy = async () => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const onDownload = async () => {
    const ok = await downloadTextFile(fileNameFor(lang, code), code);
    if (ok) {
      setSaved(true);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <figure className="code-block" data-lang={lang}>
      <figcaption className="code-head">
        <span className="code-lang">
          <FileCode2 size={14} aria-hidden />
          <span>{label}</span>
          <span className="code-meta">
            {rawLines.length} {rawLines.length === 1 ? 'line' : 'lines'}
          </span>
        </span>
        <span className="code-actions">
          <button type="button" className="code-btn" onClick={onCopy} aria-label="Copy code" title="Copy code">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button type="button" className="code-btn" onClick={onDownload} aria-label="Download code" title="Download code">
            {saved ? <Check size={14} /> : <Download size={14} />}
            <span>{saved ? 'Saved' : 'Download'}</span>
          </button>
        </span>
      </figcaption>

      <div className="code-scroll" tabIndex={0} role="region" aria-label={`${label} code`}>
        <pre className="code-pre" style={{ ['--gutter' as string]: gutterWidth }}>
          <code>
            {rawLines.map((line, i) => {
              // Use highlighted tokens only when they still describe this exact line (stays correct mid-stream).
              const lt = tokens?.[i];
              const usable = lt && lt.map((t) => t.content).join('') === line;
              return (
                <span className="code-line" key={i}>
                  <span className="code-ln" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="code-text">
                    {usable
                      ? lt.map((t, j) => (
                          <span key={j} style={tokenStyle(t)}>
                            {t.content}
                          </span>
                        ))
                      : line}
                    {'\n'}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </figure>
  );
}

export const CodeBlock = memo(CodeBlockImpl);
