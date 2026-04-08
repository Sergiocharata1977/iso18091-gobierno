// src/app/(dashboard)/supervisor/page.tsx
// Dashboard del Supervisor para monitorear vendedores

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  Briefcase,
  Clock,
  Coffee,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VendedorActivo {
  vendedor_id: string;
  vendedor_nombre?: string;
  vendedor_email?: string;
  sesion_activa: boolean;
  ultima_ubicacion?: { lat: number; lng: number };
  inicio_jornada?: string;
}

interface WorkSessionData {
  id: string;
  vendedor_id: string;
  vendedor_nombre?: string;
  vendedor_email?: string;
  inicio: { _seconds: number };
  ubicacion_inicio?: { lat: number; lng: number };
  estado: string;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const [vendedores, setVendedores] = useState<VendedorActivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/vendedor/sessions?organization_id=${organizationId}&type=all_active`
      );
      const data = await response.json();

      if (data.sessions) {
        const mapped = data.sessions.map((session: WorkSessionData) => ({
          vendedor_id: session.vendedor_id,
          vendedor_nombre:
            session.vendedor_nombre || session.vendedor_email?.split('@')[0],
          vendedor_email: session.vendedor_email,
          sesion_activa: session.estado === 'activa',
          ultima_ubicacion: session.ubicacion_inicio,
          inicio_jornada: new Date(
            session.inicio._seconds * 1000
          ).toISOString(),
        }));
        setVendedores(mapped);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching supervisor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startIso: string) => {
    const start = new Date(startIso);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const minutes = Math.floor((diffMs / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
  };

  const vendedoresActivos = vendedores.filter(v => v.sesion_activa);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de Supervisor
          </h1>
          <p className="text-gray-500 text-sm">
            Monitoreo de vendedores en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Actualizado: {formatTime(lastUpdate.toISOString())}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vendedoresActivos.length}</p>
                <p className="text-sm text-gray-500">Trabajando ahora</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Coffee className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {vendedores.length - vendedoresActivos.length}
                </p>
                <p className="text-sm text-gray-500">Fuera de trabajo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{vendedores.length}</p>
                <p className="text-sm text-gray-500">Total vendedores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vendedores Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Vendedores Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendedoresActivos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay vendedores trabajando en este momento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendedoresActivos.map(vendedor => (
                <div
                  key={vendedor.vendedor_id}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      {vendedor.vendedor_nombre?.charAt(0).toUpperCase() || 'V'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {vendedor.vendedor_nombre || 'Vendedor'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Inicio:{' '}
                          {vendedor.inicio_jornada
                            ? formatTime(vendedor.inicio_jornada)
                            : '-'}
                        </span>
                        {vendedor.inicio_jornada && (
                          <span className="text-green-600 font-medium">
                            {formatDuration(vendedor.inicio_jornada)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {vendedor.ultima_ubicacion && (
                    <a
                      href={`https://www.google.com/maps?q=${vendedor.ultima_ubicacion.lat},${vendedor.ultima_ubicacion.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 text-sm hover:underline"
                    >
                      <MapPin className="w-4 h-4" />
                      Ver mapa
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
