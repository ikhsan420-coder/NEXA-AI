import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: register the service worker on the web only. The native Android shell serves assets locally.
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform() && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

// Native shell polish (status bar + splash). Loaded lazily so the web build never pays for it.
if (Capacitor.isNativePlatform()) {
  void (async () => {
    try {
      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([import('@capacitor/status-bar'), import('@capacitor/splash-screen')]);
      await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
      await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
    } catch {
      /* plugins unavailable: ignore */
    }
  })();
}
