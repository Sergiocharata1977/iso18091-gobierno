// src/components/vendedor/WorkModeToggle.tsx
// Toggle "Modo Trabajo" para activar/desactivar GPS tracking

'use client';

import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import type { UbicacionGPS } from '@/types/vendedor';
import { Briefcase, Coffee, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WorkSession {
  id: string;
  vendedor_id: string;
  organization_id: string;
  inicio: string;
  fin?: string;
  ubicacion_inicio?: UbicacionGPS;
  ubicacion_fin?: UbicacionGPS;
}

export function WorkModeToggle() {
  const { user } = useAuth();
  const [isWorking, setIsWorking] = useState(false);
  const [sessionStart, setSessionStart] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('work_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setIsWorking(true);
      setSessionStart(session.inicio);
    }
  }, []);

  const captureGPS = (): Promise<UbicacionGPS | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude || undefined,
            timestamp: new Date().toISOString(),
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleToggle = async () => {
    if (!user?.id || !user?.organization_id) {
      console.error('Usuario no autenticado correctamente:', { user });
      alert(
        'Error: Usuario no autenticado. Por favor, vuelve a iniciar sesión.'
      );
      return;
    }
    setLoading(true);

    try {
      if (!isWorking) {
        // Start work session
        const ubicacion = await captureGPS();

        const response = await fetch('/api/vendedor/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            organization_id: user.organization_id,
            vendedor_id: user.id,
            vendedor_nombre: user.email?.split('@')[0],
            vendedor_email: user.email,
            ubicacion: ubicacion
              ? {
                  lat: ubicacion.lat,
                  lng: ubicacion.lng,
                  accuracy: ubicacion.accuracy,
                }
              : undefined,
          }),
        });

        const data = await response.json();
        if (data.success && data.session) {
          const session = {
            id: data.session.id,
            vendedor_id: user.id,
            organization_id: user.organization_id,
            inicio: new Date().toISOString(),
            ubicacion_inicio: ubicacion || undefined,
          };
          localStorage.setItem('work_session', JSON.stringify(session));
          setSessionStart(session.inicio);
          setSessionId(data.session.id);
          setIsWorking(true);
        }
      } else {
        // End work session
        const savedSession = localStorage.getItem('work_session');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          const ubicacion = await captureGPS();

          await fetch('/api/vendedor/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'end',
              organization_id: user.organization_id,
              vendedor_id: user.id,
              session_id: session.id || sessionId,
              ubicacion: ubicacion
                ? {
                    lat: ubicacion.lat,
                    lng: ubicacion.lng,
                    accuracy: ubicacion.accuracy,
                  }
                : undefined,
            }),
          });

          localStorage.removeItem('work_session');
        }
        setSessionStart(null);
        setSessionId(null);
        setIsWorking(false);
      }
    } catch (error) {
      console.error('Error toggling work mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        isWorking
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isWorking ? 'bg-green-500' : 'bg-gray-400'
          }`}
        >
          {isWorking ? (
            <Briefcase className="w-6 h-6 text-white" />
          ) : (
            <Coffee className="w-6 h-6 text-white" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {isWorking ? '🟢 Trabajando' : '🔴 Fuera de Trabajo'}
          </p>
          {sessionStart && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Desde: {formatTime(sessionStart)}
            </p>
          )}
        </div>
      </div>

      <Switch
        checked={isWorking}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}
