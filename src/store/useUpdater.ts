import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UpdateError,
  canInstallPackages,
  checkForUpdate,
  downloadApk,
  installApk,
  isNativeApp,
  openInstallSettings,
  type UpdateInfo,
} from '../lib/update';

export type UpdatePhase = 'idle' | 'available' | 'permission' | 'downloading' | 'installing' | 'error' | 'web-ready';
export type CheckStatus = 'idle' | 'checking' | 'uptodate' | 'found' | 'error';

export interface Updater {
  phase: UpdatePhase;
  info: UpdateInfo | null;
  received: number;
  total: number;
  error: string | null;
  checkStatus: CheckStatus;
  checkMessage: string;
  checkNow: () => Promise<void>;
  startUpdate: () => Promise<void>;
  installAgain: () => Promise<void>;
  openSettings: () => void;
  dismiss: () => void;
  reloadWeb: () => void;
}

const LAST_CHECK_KEY = 'nexa.update.lastCheck';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const WEB_UPDATE_EVENT = 'nexa:web-update';

const readLast = (): number => {
  try {
    return Number(localStorage.getItem(LAST_CHECK_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeLast = () => {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/**
 * In-app updates.
 *  - Android app: checks GitHub Releases, downloads the APK with progress, opens the system installer.
 *  - Web/PWA: the service worker updates itself; this only offers a "Reload" when a new version is ready.
 * `enabled` lets the caller hold automatic prompts back (e.g. while the What's new screen is open).
 */
export function useUpdater(currentVersion: string, enabled: boolean): Updater {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [received, setReceived] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [checkMessage, setCheckMessage] = useState('');

  const apkPath = useRef<string | null>(null);
  const busy = useRef(false);
  const infoRef = useRef<UpdateInfo | null>(null);
  infoRef.current = info;
  const phaseRef = useRef<UpdatePhase>('idle');
  phaseRef.current = phase;

  const runCheck = useCallback(
    async (manual: boolean) => {
      if (!isNativeApp()) {
        if (manual) {
          const reg = await navigator.serviceWorker?.getRegistration?.();
          await reg?.update().catch(() => undefined);
          setCheckStatus('uptodate');
          setCheckMessage('Checked. If a new version exists you will be asked to reload.');
        }
        return;
      }
      if (busy.current || phaseRef.current !== 'idle') return;
      if (!manual && Date.now() - readLast() < CHECK_INTERVAL_MS) return;
      if (manual) {
        setCheckStatus('checking');
        setCheckMessage('Checking for updates…');
      }
      busy.current = true;
      try {
        const found = await checkForUpdate(currentVersion);
        writeLast();
        if (found) {
          setInfo(found);
          setPhase('available');
          if (manual) {
            setCheckStatus('found');
            setCheckMessage(`Version ${found.version} is available.`);
          }
        } else if (manual) {
          setCheckStatus('uptodate');
          setCheckMessage(`You're on the latest version (${currentVersion}).`);
        }
      } catch (e) {
        if (manual) {
          setCheckStatus('error');
          setCheckMessage(e instanceof UpdateError ? e.message : 'Could not check for updates.');
        }
      } finally {
        busy.current = false;
      }
    },
    [currentVersion],
  );

  // Automatic check shortly after launch, and again when the app returns to the foreground.
  useEffect(() => {
    if (!enabled || !isNativeApp()) return;
    const first = window.setTimeout(() => void runCheck(false), 2500);
    const onVisible = () => document.visibilityState === 'visible' && void runCheck(false);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, runCheck]);

  // Web: a new service worker took over -> offer a reload.
  useEffect(() => {
    if (isNativeApp()) return;
    const onWeb = () => setPhase((p) => (p === 'idle' ? 'web-ready' : p));
    window.addEventListener(WEB_UPDATE_EVENT, onWeb);
    return () => window.removeEventListener(WEB_UPDATE_EVENT, onWeb);
  }, []);

  const install = useCallback(async (path: string) => {
    setPhase('installing');
    try {
      await installApk(path);
    } catch (e) {
      setError(e instanceof UpdateError ? e.message : 'Could not open the installer.');
      setPhase('error');
    }
  }, []);

  const startUpdate = useCallback(async () => {
    const target = infoRef.current;
    if (!target) return;
    setError(null);
    try {
      if (!(await canInstallPackages().catch(() => true))) {
        setPhase('permission');
        return;
      }
      setReceived(0);
      setTotal(target.size);
      setPhase('downloading');
      const path = await downloadApk(target, (r, t) => {
        setReceived(r);
        if (t) setTotal(t);
      });
      apkPath.current = path;
      await install(path);
    } catch (e) {
      setError(e instanceof UpdateError ? e.message : 'The update failed. Please try again.');
      setPhase('error');
    }
  }, [install]);

  // Returning from the system "allow installs" screen: continue automatically once permission is granted.
  useEffect(() => {
    if (phase !== 'permission') return;
    const onVisible = () => document.visibilityState === 'visible' && void startUpdate();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [phase, startUpdate]);

  const installAgain = useCallback(async () => {
    if (apkPath.current) await install(apkPath.current);
    else await startUpdate();
  }, [install, startUpdate]);

  return {
    phase,
    info,
    received,
    total,
    error,
    checkStatus,
    checkMessage,
    checkNow: () => runCheck(true),
    startUpdate,
    installAgain,
    openSettings: () => void openInstallSettings().catch(() => undefined),
    dismiss: () => setPhase('idle'),
    reloadWeb: () => window.location.reload(),
  };
}
