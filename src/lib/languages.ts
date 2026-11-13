// Language metadata for the code viewer: aliases, display names, file extensions and a conservative detector.

/** Canonical IDs that have a loader in highlight.ts (plus "plaintext"). */
export const PLAINTEXT = 'plaintext';

const ALIASES: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', node: 'javascript', nodejs: 'javascript', javascript: 'javascript',
  ts: 'typescript', typescript: 'typescript', mts: 'typescript', cts: 'typescript',
  jsx: 'jsx', tsx: 'tsx',
  py: 'python', python: 'python', python3: 'python', py3: 'python',
  sh: 'bash', bash: 'bash', zsh: 'bash', shell: 'bash', shellscript: 'bash', console: 'bash', terminal: 'bash', fish: 'bash',
  ps1: 'powershell', pwsh: 'powershell', powershell: 'powershell',
  bat: 'batch', cmd: 'batch', batch: 'batch',
  html: 'html', htm: 'html', xhtml: 'html',
  css: 'css', scss: 'scss', sass: 'scss',
  json: 'json', jsonc: 'jsonc', json5: 'jsonc',
  java: 'java',
  kt: 'kotlin', kts: 'kotlin', kotlin: 'kotlin',
  c: 'c', h: 'c',
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
  cs: 'csharp', 'c#': 'csharp', csharp: 'csharp', dotnet: 'csharp',
  sql: 'sql', mysql: 'sql', postgres: 'sql', postgresql: 'sql', pgsql: 'sql', plsql: 'sql', sqlite: 'sql', tsql: 'sql',
  lua: 'lua', luau: 'luau', roblox: 'luau',
  go: 'go', golang: 'go',
  rs: 'rust', rust: 'rust',
  php: 'php',
  rb: 'ruby', ruby: 'ruby',
  swift: 'swift',
  dart: 'dart',
  yml: 'yaml', yaml: 'yaml',
  toml: 'toml', ini: 'ini', conf: 'ini', properties: 'ini',
  xml: 'xml', svg: 'xml', xaml: 'xml', plist: 'xml',
  md: 'markdown', markdown: 'markdown', mdx: 'markdown',
  dockerfile: 'dockerfile', docker: 'dockerfile',
  makefile: 'makefile', make: 'makefile',
  cmake: 'cmake',
  diff: 'diff', patch: 'diff',
  graphql: 'graphql', gql: 'graphql',
  vue: 'vue', svelte: 'svelte',
  r: 'r',
  perl: 'perl', pl: 'perl',
  scala: 'scala',
  groovy: 'groovy', gradle: 'groovy',
  objc: 'objective-c', 'objective-c': 'objective-c', objectivec: 'objective-c',
  text: PLAINTEXT, txt: PLAINTEXT, plain: PLAINTEXT, plaintext: PLAINTEXT, output: PLAINTEXT, log: PLAINTEXT,
};

const NAMES: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', jsx: 'JSX', tsx: 'TSX', python: 'Python', bash: 'Bash',
  powershell: 'PowerShell', batch: 'Batch', html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', jsonc: 'JSON',
  java: 'Java', kotlin: 'Kotlin', c: 'C', cpp: 'C++', csharp: 'C#', sql: 'SQL', lua: 'Lua', luau: 'Luau', go: 'Go',
  rust: 'Rust', php: 'PHP', ruby: 'Ruby', swift: 'Swift', dart: 'Dart', yaml: 'YAML', toml: 'TOML', ini: 'INI',
  xml: 'XML', markdown: 'Markdown', dockerfile: 'Dockerfile', makefile: 'Makefile', cmake: 'CMake', diff: 'Diff',
  graphql: 'GraphQL', vue: 'Vue', svelte: 'Svelte', r: 'R', perl: 'Perl', scala: 'Scala', groovy: 'Groovy',
  'objective-c': 'Objective-C', [PLAINTEXT]: 'Text',
};

const EXTENSIONS: Record<string, string> = {
  javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx', python: 'py', bash: 'sh', powershell: 'ps1', batch: 'bat',
  html: 'html', css: 'css', scss: 'scss', json: 'json', jsonc: 'json', java: 'java', kotlin: 'kt', c: 'c', cpp: 'cpp',
  csharp: 'cs', sql: 'sql', lua: 'lua', luau: 'luau', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', swift: 'swift',
  dart: 'dart', yaml: 'yml', toml: 'toml', ini: 'ini', xml: 'xml', markdown: 'md', dockerfile: 'Dockerfile',
  makefile: 'Makefile', cmake: 'cmake', diff: 'diff', graphql: 'graphql', vue: 'vue', svelte: 'svelte', r: 'r',
  perl: 'pl', scala: 'scala', groovy: 'groovy', 'objective-c': 'm', [PLAINTEXT]: 'txt',
};

/** Normalise a fence info string ("language-ts", "TypeScript {1,3}", "c++") to a canonical ID, or "" if unknown. */
export function normalizeLanguage(raw: string | undefined | null): string {
  if (!raw) return '';
  const first = raw.trim().toLowerCase().replace(/^language-/, '').split(/[\s{:,]/)[0];
  return ALIASES[first] ?? '';
}

export function languageLabel(id: string, rawFallback?: string): string {
  if (NAMES[id]) return NAMES[id];
  const raw = (rawFallback || '').trim();
  return raw ? raw.toUpperCase() : 'Text';
}

export function fileNameFor(id: string, code: string): string {
  const ext = EXTENSIONS[id] ?? 'txt';
  if (id === 'dockerfile' || id === 'makefile') return ext;
  // Reuse an obvious name from the code, e.g. "public class Main" -> Main.java
  if (id === 'java') {
    const m = code.match(/\bpublic\s+(?:final\s+)?(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/);
    if (m) return `${m[1]}.java`;
  }
  if (id === 'kotlin' && /\bfun\s+main\s*\(/.test(code)) return 'Main.kt';
  if (id === 'csharp' && /\bstatic\s+(?:void|int|async\s+Task)\s+Main\s*\(/.test(code)) return 'Program.cs';
  if (id === 'html') return 'index.html';
  if (id === 'python') return 'main.py';
  if (id === 'javascript') return 'script.js';
  if (id === 'typescript') return 'main.ts';
  return `code.${ext}`;
}

/**
 * Best-effort detection for fences without a language tag. Conservative on purpose:
 * when nothing matches clearly we return "" and the block renders as plain text.
 */
export function detectLanguage(code: string): string {
  const src = code.trim();
  if (!src) return '';
  const head = src.slice(0, 4000);

  const shebang = head.match(/^#!.*\b(bash|sh|zsh|python3?|node|lua|ruby|perl)\b/);
  if (shebang) return normalizeLanguage(shebang[1]);
  if (/^<!doctype html|^<html[\s>]/i.test(head)) return 'html';
  if (/^<\?xml/i.test(head)) return 'xml';
  if (/^<\?php/i.test(head)) return 'php';
  if (/^[[{]/.test(src)) {
    try {
      JSON.parse(src);
      return 'json';
    } catch {
      /* not strict JSON */
    }
  }
  if (/^\s*(SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO\b|UPDATE\s+\w+\s+SET\b|DELETE\s+FROM\b|CREATE\s+(TABLE|INDEX|VIEW)\b|ALTER\s+TABLE\b)/i.test(head)) return 'sql';
  if (/^\s*#include\s*[<"]/m.test(head)) return /\b(std::|cout|template\s*<|namespace\s)/.test(head) ? 'cpp' : 'c';
  if (/\busing\s+System\b|\bConsole\.WriteLine\b|\bnamespace\s+\w+\s*[{;]/.test(head)) return 'csharp';
  if (/\bSystem\.out\.print|\bpublic\s+static\s+void\s+main\b|\bimport\s+java\./.test(head)) return 'java';
  if (/\bfun\s+\w+\s*\(.*\)\s*(:\s*\w+)?\s*[{=]|\bval\s+\w+\s*[:=]|\bdata\s+class\b/.test(head)) return 'kotlin';
  if (/^\s*(def|class)\s+\w+.*:\s*$|^\s*from\s+\w+[\w.]*\s+import\s|^\s*import\s+\w+\s*$|\bprint\(.*\)\s*$/m.test(head) && !/[;{}]\s*$/m.test(head)) return 'python';
  if (/\blocal\s+\w+\s*=|\bfunction\s*[\w.:]*\(.*\)\s*$[\s\S]*\bend\b|\bthen\b[\s\S]*\bend\b/m.test(head)) {
    return /\blocal\s+\w+\s*:\s*\w+|\bexport\s+type\b|:\s*(number|string|boolean)\s*[=,)]/.test(head) ? 'luau' : 'lua';
  }
  if (/^\s*(interface|type)\s+\w+[\s<=]|:\s*(string|number|boolean)\b[\s,;)=]/m.test(head) && /\b(const|let|function|export|import)\b/.test(head)) return 'typescript';
  if (/\b(const|let|var)\s+\w+\s*=|=>|\bconsole\.\w+\(|\bfunction\s+\w+\s*\(|\brequire\(|^import\s.+\sfrom\s/m.test(head)) return 'javascript';
  if (/^\s*[.#@]?[\w\-:\s,>.#]+\{[^}]*:[^}]*;/m.test(head)) return 'css';
  if (/^\s*(\$\s+|sudo\s|npm\s|npx\s|pip\s|apt(-get)?\s|git\s|cd\s|mkdir\s|echo\s|curl\s|export\s+\w+=)/m.test(head)) return 'bash';
  if (/^\s*[\w-]+:\s*(\S.*)?$/m.test(head) && /^\s*-\s+\S/m.test(head)) return 'yaml';
  return '';
}
