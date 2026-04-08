// src/app/(dashboard)/crm/mapa/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Importación dinámica para evitar error "window is not defined" de Leaflet
const CRMMap = dynamic(() => import('@/components/crm/CRMMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  ),
});

interface VendedorLocation {
  vendedor_id: string;
  vendedor_nombre?: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export default function MapaPage() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<VendedorLocation[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [sellerRoute, setSellerRoute] = useState<any[]>([]);

  // Coordenadas default (Argentina aprox)
  const defaultCenter: [number, number] = [-34.6037, -58.3816];

  const loadLastLocations = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vendedor/locations?organization_id=${organizationId}`
      );
      const data = await res.json();
      if (data.locations) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoute = async (vendedorId: string) => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vendedor/locations?organization_id=${organizationId}&vendedor_id=${vendedorId}`
      );
      const data = await res.json();
      if (data.route) {
        setSellerRoute(data.route);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLastLocations();
  }, [organizationId]);

  useEffect(() => {
    if (selectedVendedor !== 'all') {
      loadRoute(selectedVendedor);
    } else {
      setSellerRoute([]);
    }
  }, [selectedVendedor]);

  // Derivar centro del mapa
  const mapCenter =
    locations.length > 0
      ? ([locations[0].lat, locations[0].lng] as [number, number])
      : defaultCenter;

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="text-purple-600" />
            Mapa de Vendedores
          </h1>
          <p className="text-gray-500 text-sm">
            Monitoreo de ubicación en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los vendedores</SelectItem>
              {locations.map(v => (
                <SelectItem key={v.vendedor_id} value={v.vendedor_id}>
                  {v.vendedor_nombre || v.vendedor_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadLastLocations}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-3 h-full min-h-[400px]">
          <CRMMap
            center={mapCenter}
            zoom={selectedVendedor !== 'all' ? 15 : 10}
            markers={selectedVendedor === 'all' ? locations : []}
            route={sellerRoute}
          />
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Vendedores Conectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {locations.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No hay datos recientes
                  </p>
                ) : (
                  locations.map(loc => (
                    <div
                      key={loc.vendedor_id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${selectedVendedor === loc.vendedor_id ? 'bg-purple-50 border border-purple-200' : ''}`}
                      onClick={() => setSelectedVendedor(loc.vendedor_id)}
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {loc.vendedor_nombre || loc.vendedor_id}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(loc.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
