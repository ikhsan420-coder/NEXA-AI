import { registerPlugin } from '@capacitor/core';

export interface ApkInstallerPlugin {
  /** Has the user allowed this app to install packages? */
  canInstall(): Promise<{ allowed: boolean }>;
  /** Open the system screen where that permission is granted. */
  openInstallSettings(): Promise<void>;
  /** Hand a downloaded APK (inside the app cache) to the system installer. */
  install(options: { path: string }): Promise<void>;
}

/** Implemented in android/.../ApkInstallerPlugin.java. Only available inside the Android app. */
export const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');
