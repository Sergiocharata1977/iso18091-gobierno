// src/services/location/LocationService.ts
import type { UbicacionGPS } from '@/types/vendedor';

export const LocationService = {
  getCurrentPosition(): Promise<UbicacionGPS | null> {
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
        err => {
          console.error('Error getting location:', err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  async sendLocationUpdate(
    organizationId: string,
    vendedorId: string,
    location: UbicacionGPS
  ) {
    try {
      await fetch('/api/vendedor/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          vendedor_id: vendedorId,
          ...location,
        }),
      });
    } catch (error) {
      console.error('Error sending location update:', error);
    }
  },
};
