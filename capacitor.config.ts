// DEPRECATED 2026-04-08 — Canal mobile oficial: Android nativo por flavor. Ver docs/migrations/native-android-cutover.md
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doncandido.vendedor',
  appName: 'Don Cándido Vendedor',
  webDir: 'public', // Dummy directory (not used in hybrid mode)
  server: {
    // HYBRID MODE: APK loads production URL
    url: 'https://doncandidoia.com/app-vendedor',
    cleartext: true,
    androidScheme: 'https',
    // Force all navigation to stay in WebView
    allowNavigation: ['doncandidoia.com', '*.doncandidoia.com'],
  },
  android: {
    // Use internal WebView, not Chrome Custom Tabs
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a', // Green to match app theme
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
