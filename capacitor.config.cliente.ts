// DEPRECATED 2026-04-08 — Canal mobile oficial: Android nativo por flavor. Ver docs/migrations/native-android-cutover.md
// capacitor.config.cliente.ts
// Configuracion Capacitor para el APK del CLIENTE (Agro Biciufa)
// App ID:   com.agrobiciufa.cliente
// URL:      https://doncandidoia.com/app-cliente
// SplashBG: #dc2626  (rojo - tema cliente)
//
// USO: este archivo es referencia. El script scripts/build-cliente-apk.sh
//      inyecta su version JSON en android/ antes de compilar.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agrobiciufa.cliente',
  appName: 'Agro Biciufa',
  webDir: 'public',
  server: {
    url: 'https://doncandidoia.com/app-cliente',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: ['doncandidoia.com', '*.doncandidoia.com'],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#dc2626', // Rojo - tema app cliente
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
  },
};

export default config;
