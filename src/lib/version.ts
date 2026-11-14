export type Semver = [number, number, number];

/** Parse "1.2.3", "v1.2.3" or "1.2.3-beta" (suffix ignored). Returns null when it is not a version. */
export function parseVersion(input: string): Semver | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec((input || '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** <0 when a<b, 0 when equal, >0 when a>b. Unparseable versions compare as equal (never trigger an update). */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

/** Entries newer than `lastSeen` and not newer than `current`, newest first. */
export function entriesSince(entries: ChangelogEntry[], lastSeen: string, current: string): ChangelogEntry[] {
  return entries
    .filter((e) => compareVersions(e.version, lastSeen) > 0 && compareVersions(e.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}
