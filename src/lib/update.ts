import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ApkInstaller } from '../native/apkInstaller';
import { compareVersions } from './version';

// Releases are published by .github/workflows/release-apk.yml
const REPO = 'ikhsan420-coder/NEXA-AI';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const TRUSTED_DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;

export const isNativeApp = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export interface UpdateInfo {
  version: string;
  notes: string;
  apkUrl: string;
  size: number;
  publishedAt?: string;
}

export class UpdateError extends Error {}

/** Returns the newest release when it is newer than `current`, otherwise null. Throws UpdateError on failure. */
export async function checkForUpdate(current: string, signal?: AbortSignal): Promise<UpdateInfo | null> {
  let res: Response;
  try {
    res = await fetch(LATEST_URL, { headers: { Accept: 'application/vnd.github+json' }, signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new UpdateError('Could not reach the update server. Check your internet connection.');
  }
  if (res.status === 404) return null; // no release published yet
  if (res.status === 403 || res.status === 429) throw new UpdateError('Update check is rate limited. Try again later.');
  if (!res.ok) throw new UpdateError(`Update check failed (${res.status}).`);

  const data = (await res.json()) as {
    tag_name?: string;
    body?: string;
    published_at?: string;
    assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>;
  };
  const tag = (data.tag_name || '').trim();
  if (!tag || compareVersions(tag, current) <= 0) return null;

  const asset = (data.assets || []).find(
    (a) => a.name?.toLowerCase().endsWith('.apk') && a.browser_download_url?.startsWith(TRUSTED_DOWNLOAD_PREFIX),
  );
  if (!asset?.browser_download_url) throw new UpdateError('The new version has no downloadable APK yet.');

  return {
    version: tag.replace(/^v/, ''),
    notes: (data.body || '').trim(),
    apkUrl: asset.browser_download_url,
    size: Number(asset.size) || 0,
    publishedAt: data.published_at,
  };
}

/** Download the APK into the app cache with progress. Resolves to the native file path. */
export async function downloadApk(info: UpdateInfo, onProgress: (received: number, total: number) => void): Promise<string> {
  if (!info.apkUrl.startsWith(TRUSTED_DOWNLOAD_PREFIX)) throw new UpdateError('Untrusted download address.');
  const dir = Directory.Cache;
  await Filesystem.rmdir({ path: 'updates', directory: dir, recursive: true }).catch(() => undefined);

  const handle = await Filesystem.addListener('progress', (p) => onProgress(p.bytes, p.contentLength || info.size));
  try {
    const res = await Filesystem.downloadFile({
      url: info.apkUrl,
      path: `updates/NEXA-AI-v${info.version}.apk`,
      directory: dir,
      recursive: true,
      progress: true,
    });
    if (!res.path) throw new UpdateError('The download did not produce a file.');
    if (info.size > 0) {
      const st = await Filesystem.stat({ path: `updates/NEXA-AI-v${info.version}.apk`, directory: dir });
      if (Number(st.size) !== info.size) throw new UpdateError('The download is incomplete. Please try again.');
    }
    return res.path;
  } catch (e) {
    if (e instanceof UpdateError) throw e;
    throw new UpdateError('The download failed. Check your connection and try again.');
  } finally {
    await handle.remove();
  }
}

export const canInstallPackages = async (): Promise<boolean> => (await ApkInstaller.canInstall()).allowed;
export const openInstallSettings = (): Promise<void> => ApkInstaller.openInstallSettings();

export async function installApk(path: string): Promise<void> {
  try {
    await ApkInstaller.install({ path });
  } catch {
    throw new UpdateError('Could not open the installer. Please try again.');
  }
}
