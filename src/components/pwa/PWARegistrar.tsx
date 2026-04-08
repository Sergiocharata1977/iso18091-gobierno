'use client';

import { useEffect } from 'react';

/**
 * Componente cliente que registra el Service Worker
 * Se usa en el layout principal
 */
export function PWARegistrar() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('[PWA] Service Worker registrado:', registration.scope);
        })
        .catch(error => {
          console.error('[PWA] Error registrando Service Worker:', error);
        });
    }
  }, []);

  return null;
}
