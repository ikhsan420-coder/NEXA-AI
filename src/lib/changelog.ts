import raw from '../changelog.json';
import { entriesSince, type ChangelogEntry } from './version';

export const CHANGELOG = raw as ChangelogEntry[];
export const CURRENT_VERSION: string = __APP_VERSION__;

const KEY = 'nexa.lastSeenVersion';

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function markVersionSeen(version: string = CURRENT_VERSION): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Changelog entries to show after an update. A fresh install (nothing stored yet) shows nothing
 * and just records the current version, so only real updates trigger the What's new screen.
 */
export function pendingWhatsNew(): ChangelogEntry[] {
  const last = read();
  if (!last) {
    markVersionSeen();
    return [];
  }
  return entriesSince(CHANGELOG, last, CURRENT_VERSION);
}

export function entryFor(version: string): ChangelogEntry | undefined {
  return CHANGELOG.find((e) => e.version === version);
}
