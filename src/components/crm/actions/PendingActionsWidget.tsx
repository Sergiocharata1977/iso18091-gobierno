'use client';

import { ActionTypeBadge } from '@/components/crm/actions/ActionTypeBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CRMAccion } from '@/types/crmAcciones';
import { format } from 'date-fns';
import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function PendingActionsWidget() {
  const { user } = useAuth();
  const [actions, setActions] = useState<CRMAccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      if (!user?.organization_id) return;
      try {
        setLoading(true);
        // Traer acciones programadas, del usuario actual, limite 5
        const res = await fetch(
          `/api/crm/acciones?organization_id=${user.organization_id}&vendedor_id=${user.id}&estado=programada&limit=5`
        );
        const data = await res.json();
        if (data.success) {
          setActions(data.data);
        }
      } catch (error) {
        console.error('Error fetching pending actions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
  }, [user?.organization_id, user?.id]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" /> Mis Próximas Acciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return null; // Ocultar si no hay acciones, para no ocupar espacio
    // O mostrar mensaje vacío si se prefiere:
    /*
    return (
      <Card className="bg-gray-50 border-dashed">
        <CardContent className="p-4 text-center text-sm text-gray-500">
          No tienes acciones pendientes.
        </CardContent>
      </Card>
    );
    */
  }

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" /> Mis Próximas Acciones
        </CardTitle>
        <Link href="/crm/acciones">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-blue-600 hover:text-blue-700"
          >
            Ver todas
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {actions.map(action => (
            <div
              key={action.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
            >
              <div className="mt-0.5">
                <ActionTypeBadge
                  tipo={action.tipo}
                  showLabel={false}
                  className="w-6 h-6 text-xs"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-900 truncate pr-2">
                    {action.titulo}
                  </p>
                  <span className="text-xs font-medium text-red-500 whitespace-nowrap bg-red-50 px-1.5 py-0.5 rounded">
                    {format(
                      new Date(action.fecha_programada || action.createdAt),
                      'HH:mm'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 truncate">
                    {action.cliente_nombre || 'Sin cliente'}
                  </p>
                  {action.oportunidad_titulo && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-blue-600 truncate bg-blue-50 px-1 rounded max-w-[100px]">
                        {action.oportunidad_titulo}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
