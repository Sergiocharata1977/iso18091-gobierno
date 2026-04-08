// src/components/crm/CRMMap.tsx
'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from 'react-leaflet';

// Interfaces
interface Location {
  lat: number;
  lng: number;
  vendedor_id?: string;
  vendedor_nombre?: string;
  timestamp?: string;
}

interface CRMMapProps {
  center: [number, number];
  zoom: number;
  markers?: Location[];
  route?: Location[];
}

export default function CRMMap({
  center,
  zoom,
  markers = [],
  route = [],
}: CRMMapProps) {
  // Memoize icon to prevent recreation on every render, but keep L usage inside component
  const icon = useMemo(() => {
    if (typeof window === 'undefined') return null;

    return L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, []);

  if (!icon) return null; // Should not happen with ssr: false

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcadores de última ubicación */}
        {markers.map((m, idx) =>
          m.lat && m.lng ? (
            <Marker
              key={`${m.vendedor_id}-${idx}`}
              position={[m.lat, m.lng]}
              icon={icon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold mb-1">{m.vendedor_id}</p>
                  <p className="text-gray-500 text-xs">
                    {m.timestamp
                      ? new Date(m.timestamp).toLocaleString()
                      : 'Sin fecha'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* Polilínea de recorrido */}
        {route.length > 0 && (
          <Polyline
            positions={route.map(p => [p.lat, p.lng])}
            color="blue"
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
}
