// src/components/vendedor/UpdateAppButton.tsx
// Botón para forzar actualización de la PWA

'use client';

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function UpdateAppButton() {
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    setUpdating(true);
    setSuccess(false);

    try {
      // Unregister service worker and clear caches
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setSuccess(true);

      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating app:', error);
      setUpdating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleUpdate}
      disabled={updating}
      className="w-full gap-2"
    >
      {updating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {success ? 'Actualizado!' : 'Actualizando...'}
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" />
          Actualizar App
        </>
      )}
    </Button>
  );
}
