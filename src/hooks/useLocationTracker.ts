// src/hooks/useLocationTracker.ts
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LocationService } from '@/services/location/LocationService';
import { useEffect, useRef } from 'react';

const TRACKING_INTERVAL = 5 * 60 * 1000; // 5 minutos

export function useLocationTracker() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id || !user?.organization_id) return;

    const checkAndTrack = async () => {
      // Verificar si hay sesión activa en local storage
      // Nota: Esto asume que WorkModeToggle gestiona 'work_session'
      const sessionData = localStorage.getItem('work_session');
      if (!sessionData) return;

      try {
        const session = JSON.parse(sessionData);
        // Validar que la sesión corresponda al usuario actual
        if (session.vendedor_id !== user.id) return;

        const location = await LocationService.getCurrentPosition();
        if (location) {
          console.log('[Tracker] Envio ubicación:', location);
          if (user.organization_id) {
            await LocationService.sendLocationUpdate(
              user.organization_id,
              user.id,
              location
            );
          }
        }
      } catch (error) {
        console.error('[Tracker] Error en ciclo de tracking:', error);
      }
    };

    // Ejecutar inmediatamente
    checkAndTrack();

    // Configurar intervalo
    intervalRef.current = setInterval(checkAndTrack, TRACKING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user]);
}
