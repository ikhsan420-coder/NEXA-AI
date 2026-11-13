// Shiki integration. The highlighter core is lazy-loaded and every grammar is a separate chunk that is
// only fetched the first time a block in that language appears, so the initial bundle stays small.
import type { HighlighterCore, ThemedToken, ThemeRegistrationRaw } from 'shiki/core';
import { PLAINTEXT } from './languages';

type LangLoader = () => Promise<unknown>;

const LANG_LOADERS: Record<string, LangLoader> = {
  lua: () => import('@shikijs/langs/lua'),
  luau: () => import('@shikijs/langs/luau'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  jsx: () => import('@shikijs/langs/jsx'),
  tsx: () => import('@shikijs/langs/tsx'),
  python: () => import('@shikijs/langs/python'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  scss: () => import('@shikijs/langs/scss'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  java: () => import('@shikijs/langs/java'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  csharp: () => import('@shikijs/langs/csharp'),
  sql: () => import('@shikijs/langs/sql'),
  bash: () => import('@shikijs/langs/bash'),
  powershell: () => import('@shikijs/langs/powershell'),
  batch: () => import('@shikijs/langs/batch'),
  go: () => import('@shikijs/langs/go'),
  rust: () => import('@shikijs/langs/rust'),
  php: () => import('@shikijs/langs/php'),
  ruby: () => import('@shikijs/langs/ruby'),
  swift: () => import('@shikijs/langs/swift'),
  dart: () => import('@shikijs/langs/dart'),
  yaml: () => import('@shikijs/langs/yaml'),
  toml: () => import('@shikijs/langs/toml'),
  ini: () => import('@shikijs/langs/ini'),
  xml: () => import('@shikijs/langs/xml'),
  markdown: () => import('@shikijs/langs/markdown'),
  dockerfile: () => import('@shikijs/langs/dockerfile'),
  makefile: () => import('@shikijs/langs/makefile'),
  cmake: () => import('@shikijs/langs/cmake'),
  diff: () => import('@shikijs/langs/diff'),
  graphql: () => import('@shikijs/langs/graphql'),
  vue: () => import('@shikijs/langs/vue'),
  svelte: () => import('@shikijs/langs/svelte'),
  r: () => import('@shikijs/langs/r'),
  perl: () => import('@shikijs/langs/perl'),
  scala: () => import('@shikijs/langs/scala'),
  groovy: () => import('@shikijs/langs/groovy'),
  'objective-c': () => import('@shikijs/langs/objective-c'),
};

export const SUPPORTED_LANGUAGES = Object.keys(LANG_LOADERS);

/** "NEXA Night": a dark theme tuned for the Liquid Glass palette (indigo / cyan accents on near-black blue). */
const NEXA_DARK: ThemeRegistrationRaw = {
  name: 'nexa-night',
  type: 'dark',
  colors: { 'editor.background': '#0B0E18', 'editor.foreground': '#D6DEF5' },
  settings: [
    { settings: { foreground: '#D6DEF5', background: '#0B0E18' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5C6A92', fontStyle: 'italic' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#9BE3A5' } },
    { scope: ['string.regexp', 'constant.character.escape'], settings: { foreground: '#7FE0D4' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#FFB86B' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { foreground: '#B39DFF' } },
    { scope: ['keyword.operator', 'punctuation.separator', 'punctuation.terminator'], settings: { foreground: '#8FB4FF' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: '#7CB7FF' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.class', 'support.type', 'entity.other.inherited-class'], settings: { foreground: '#FFD88A' } },
    { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: '#D6DEF5' } },
    { scope: ['variable.parameter'], settings: { foreground: '#F1B7FF' } },
    { scope: ['variable.language', 'variable.other.constant'], settings: { foreground: '#FF9DB1' } },
    { scope: ['variable.other.property', 'support.variable.property', 'meta.object-literal.key'], settings: { foreground: '#8ED6FF' } },
    { scope: ['entity.name.tag', 'meta.tag'], settings: { foreground: '#FF8FA8' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#FFD88A', fontStyle: 'italic' } },
    { scope: ['support.type.property-name.json'], settings: { foreground: '#8ED6FF' } },
    { scope: ['entity.name.tag.css', 'entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'], settings: { foreground: '#FF8FA8' } },
    { scope: ['support.type.property-name.css', 'support.type.vendored.property-name.css'], settings: { foreground: '#8ED6FF' } },
    { scope: ['meta.preprocessor', 'keyword.control.directive', 'punctuation.definition.directive'], settings: { foreground: '#7FE0D4' } },
    { scope: ['markup.inserted'], settings: { foreground: '#9BE3A5' } },
    { scope: ['markup.deleted'], settings: { foreground: '#FF8FA8' } },
    { scope: ['markup.heading'], settings: { foreground: '#7CB7FF', fontStyle: 'bold' } },
    { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
    { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
    { scope: ['invalid'], settings: { foreground: '#FF6B81' } },
  ],
};

export type HighlightTheme = 'dark' | 'light';

let corePromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();
const loadingLangs = new Map<string, Promise<boolean>>();
let lightLoaded = false;

async function getCore(): Promise<HighlighterCore> {
  if (!corePromise) {
    corePromise = (async () => {
      const [{ createHighlighterCore }, { createOnigurumaEngine }] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/oniguruma'),
      ]);
      return createHighlighterCore({
        themes: [NEXA_DARK],
        langs: [],
        engine: createOnigurumaEngine(import('shiki/wasm')),
      });
    })();
    corePromise.catch(() => {
      corePromise = null; // allow a retry after a transient chunk-load failure
    });
  }
  return corePromise;
}

async function ensureLight(core: HighlighterCore): Promise<void> {
  if (lightLoaded) return;
  const mod = await import('@shikijs/themes/github-light-default');
  await core.loadTheme(mod.default);
  lightLoaded = true;
}

async function ensureLang(core: HighlighterCore, lang: string): Promise<boolean> {
  if (loadedLangs.has(lang)) return true;
  const loader = LANG_LOADERS[lang];
  if (!loader) return false;
  let p = loadingLangs.get(lang);
  if (!p) {
    p = (async () => {
      try {
        const mod = (await loader()) as { default: Parameters<HighlighterCore['loadLanguage']>[0] };
        await core.loadLanguage(mod.default);
        loadedLangs.add(lang);
        return true;
      } catch {
        return false;
      } finally {
        loadingLangs.delete(lang);
      }
    })();
    loadingLangs.set(lang, p);
  }
  return p;
}

export interface HighlightResult {
  /** One entry per source line. */
  lines: ThemedToken[][];
  background: string;
  foreground: string;
}

const MAX_HIGHLIGHT_CHARS = 200_000; // keep the UI responsive for absurdly large blocks

/** Tokenise `code`. Resolves to null when the language is unsupported/unavailable (caller shows plain text). */
export async function highlight(code: string, lang: string, theme: HighlightTheme): Promise<HighlightResult | null> {
  if (!lang || lang === PLAINTEXT || code.length > MAX_HIGHLIGHT_CHARS) return null;
  try {
    const core = await getCore();
    if (theme === 'light') await ensureLight(core);
    if (!(await ensureLang(core, lang))) return null;
    const themeName = theme === 'light' ? 'github-light-default' : 'nexa-night';
    const res = core.codeToTokens(code, { lang, theme: themeName });
    return { lines: res.tokens, background: res.bg ?? '', foreground: res.fg ?? '' };
  } catch {
    return null;
  }
}

/** Start downloading the engine early (e.g. when the first answer starts streaming). */
export function preloadHighlighter(): void {
  void getCore().catch(() => undefined);
}
