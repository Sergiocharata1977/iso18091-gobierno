'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { NewActionModal } from '@/components/crm/actions/NewActionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CRMAccion } from '@/types/crmAcciones';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ClientActionTimelineProps {
  clienteId: string;
  clienteNombre?: string;
  oportunidadId?: string;
  oportunidadTitulo?: string;
}

export function ClientActionTimeline({
  clienteId,
  clienteNombre,
  oportunidadId,
  oportunidadTitulo,
}: ClientActionTimelineProps) {
  const { user } = useAuth();
  const [acciones, setAcciones] = useState<CRMAccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcciones = async () => {
    if (!user?.organization_id) return;
    setLoading(true);
    try {
      let url = `/api/crm/acciones?organization_id=${user.organization_id}&cliente_id=${clienteId}`;
      if (oportunidadId) {
        url += `&oportunidad_id=${oportunidadId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        // Ordenar por fecha programada descendente (más reciente arriba)
        // O mejor: si está completada fecha_realizada, sino fecha_programada
        setAcciones(data.data);
      } else {
        setError(data.error || 'Error al cargar acciones');
      }
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcciones();
  }, [user?.organization_id, clienteId, oportunidadId]);

  if (loading && acciones.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Agrupar por mes para un diseño más ordenado
  const groupedActions = acciones.reduce(
    (groups, action) => {
      const dateStr = action.fecha_programada || action.createdAt;
      const date = new Date(dateStr);
      const key = format(date, 'MMMM yyyy', { locale: es });
      if (!groups[key]) groups[key] = [];
      groups[key].push(action);
      return groups;
    },
    {} as Record<string, CRMAccion[]>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gray-500" />
          Historial de Interacciones
        </CardTitle>
        <NewActionModal
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          oportunidadId={oportunidadId}
          oportunidadTitulo={oportunidadTitulo}
          onActionCreated={fetchAcciones}
          triggerLabel="Nueva Acción"
        />
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {error ? (
          <div className="text-center py-12 text-red-500">
            <p className="font-medium">Error al cargar interacciones</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : acciones.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay acciones registradas.</p>
            <p className="text-sm">
              Programa una llamada, visita o tarea para comenzar.
            </p>
          </div>
        ) : (
          <div className="relative p-6">
            {/* Línea vertical del timeline */}
            <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-gray-200" />

            {Object.entries(groupedActions).map(([month, monthActions]) => (
              <div key={month} className="mb-8 last:mb-0 relative">
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 mb-4 -mx-6 px-6 border-b border-gray-100 flex items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded">
                    {month}
                  </span>
                </div>

                <div className="space-y-6">
                  {monthActions.map(action => (
                    <div key={action.id} className="relative pl-10 group">
                      {/* Punto en la línea de tiempo */}
                      <div
                        className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white z-10 ${
                          action.estado === 'completada'
                            ? 'border-green-500 text-green-500'
                            : action.estado === 'vencida'
                              ? 'border-red-500 text-red-500'
                              : 'border-blue-500 text-blue-500'
                        }`}
                      >
                        {action.estado === 'completada' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <ActionTypeBadge tipo={action.tipo} />
                            <h4 className="font-medium text-gray-900">
                              {action.titulo}
                            </h4>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {format(
                              new Date(
                                action.fecha_programada || action.createdAt
                              ),
                              "d MMM 'at' HH:mm",
                              { locale: es }
                            )}
                          </span>
                        </div>

                        {action.descripcion && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                            {action.descripcion}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex gap-3">
                            <span>
                              Por: <strong>{action.vendedor_nombre}</strong>
                            </span>
                            {action.oportunidad_titulo && (
                              <span className="text-blue-600 bg-blue-50 px-1.5 rounded">
                                {action.oportunidad_titulo}
                              </span>
                            )}
                          </div>
                          {action.resultado === 'realizada' && (
                            <span className="text-green-600 font-medium">
                              Realizada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
