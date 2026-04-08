// src/hooks/usePushNotifications.ts
// Hook para manejar notificaciones push en PWA

import { useCallback, useEffect, useState } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    loading: false,
    error: null,
  });

  // Verificar soporte y permisos al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported =
      'Notification' in window && 'serviceWorker' in navigator;

    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'default',
    }));

    // Verificar si ya está suscrito
    if (isSupported && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          registration.pushManager.getSubscription().then(subscription => {
            setState(prev => ({
              ...prev,
              isSubscribed: !!subscription,
            }));
          });
        })
        .catch(() => {
          // Service worker no disponible
        });
    }
  }, []);

  // Solicitar permiso de notificación
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Las notificaciones no son soportadas en este navegador',
      }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({
        ...prev,
        permission,
        loading: false,
      }));
      return permission === 'granted';
    } catch (_err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al solicitar permisos',
      }));
      return false;
    }
  }, [state.isSupported]);

  // Suscribirse a push notifications
  const subscribe = useCallback(async () => {
    if (!state.isSupported || state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Por ahora, simulamos la suscripción
      // La implementación real requiere configurar Firebase Cloud Messaging
      // o un servidor de push notifications propio

      setState(prev => ({
        ...prev,
        loading: false,
        isSubscribed: true,
        error: null,
      }));

      // Mostrar notificación de prueba
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('Notificaciones activadas', {
          body: 'Recibirás alertas de sincronización y recordatorios',
          icon: '/icons/icon-192x192.png',
        });
      }

      return { simulated: true };
    } catch (err) {
      console.error('Error al suscribirse:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al suscribirse a notificaciones',
      }));
      return null;
    }
  }, [state.isSupported, state.permission, requestPermission]);

  // Desuscribirse
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      setState(prev => ({
        ...prev,
        loading: false,
        isSubscribed: false,
      }));

      return true;
    } catch (_err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al cancelar suscripción',
      }));
      return false;
    }
  }, []);

  // Enviar notificación local (para testing)
  const sendLocalNotification = useCallback(
    async (title: string, body?: string) => {
      if (state.permission !== 'granted') {
        console.warn('Permisos de notificación no otorgados');
        return;
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
        });
      }
    },
    [state.permission]
  );

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
