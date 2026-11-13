import type { CapacitorConfig } from '@capacitor/cli';

// Production builds talk to an HTTPS backend. For testing against a plain-HTTP backend on your LAN
// (e.g. http://192.168.1.20:8787) build with:  CAP_DEV_CLEARTEXT=1 npm run android:debug
// Never ship a release build with this flag.
const devCleartext = process.env.CAP_DEV_CLEARTEXT === '1';

const config: CapacitorConfig = {
  appId: 'com.nexaai.assistant',
  appName: 'NEXA AI',
  webDir: 'dist',
  backgroundColor: '#080A10',
  android: {
    allowMixedContent: devCleartext,
  },
  server: {
    // origin becomes https://localhost (or http://localhost in dev), both already allowed by the backend CORS list
    androidScheme: devCleartext ? 'http' : 'https',
    cleartext: devCleartext,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false, // hidden from src/main.tsx once the UI is ready
      backgroundColor: '#080A10',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080A10',
    },
    SystemBars: {
      insetsHandling: 'css',
    },
  },
};

export default config;
