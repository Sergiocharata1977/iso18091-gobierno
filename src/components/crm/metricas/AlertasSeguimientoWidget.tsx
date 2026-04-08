'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { ClienteCRM } from '@/types/crm';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ClienteSinContacto {
  clienteId: string;
  razon_social: string;
  dias_sin_contacto: number;
  responsable_id: string;
}

interface AlertasSeguimientoWidgetProps {
  dias?: number;
}

export function AlertasSeguimientoWidget({
  dias = 15,
}: AlertasSeguimientoWidgetProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id;
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteSinContacto[]>([]);
  const [responsables, setResponsables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!organizationId) return;

    const loadData = async () => {
      try {
        setLoading(true);

        const [alertasResponse, clientesResponse] = await Promise.all([
          fetch(
            `/api/crm/metricas/sin-contacto?organization_id=${organizationId}&dias=${dias}`
          ),
          fetch(`/api/crm/clientes?organization_id=${organizationId}`),
        ]);

        const [alertasPayload, clientesPayload] = await Promise.all([
          alertasResponse.json(),
          clientesResponse.json(),
        ]);

        if (!alertasResponse.ok || !alertasPayload.success) {
          throw new Error(
            alertasPayload.error || 'No se pudieron cargar las alertas'
          );
        }

        setClientes((alertasPayload.data || []).slice(0, 10));

        const responsablesMap = ((clientesPayload.data || []) as ClienteCRM[])
          .filter(cliente => cliente.responsable_id)
          .reduce(
            (acc, cliente) => {
              acc[cliente.responsable_id] =
                cliente.responsable_nombre || 'Sin asignar';
              return acc;
            },
            {} as Record<string, string>
          );

        setResponsables(responsablesMap);
      } catch (error) {
        console.error('Error loading follow-up alerts:', error);
        setClientes([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [dias, organizationId]);

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Requieren seguimiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-amber-700">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : clientes.length ? (
          <div className="space-y-3">
            {clientes.map(cliente => (
              <div
                key={cliente.clienteId}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">
                    {cliente.razon_social}
                  </p>
                  <p className="text-sm text-slate-600">
                    {cliente.dias_sin_contacto} dias sin contacto
                  </p>
                  <p className="text-sm text-slate-500">
                    Vendedor:{' '}
                    {responsables[cliente.responsable_id] || 'Sin asignar'}
                  </p>
                </div>
                <Link href={`/crm/clientes/${cliente.clienteId}`}>
                  <Button
                    variant="outline"
                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 lg:w-auto"
                  >
                    Ver cliente
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            No hay clientes con mas de {dias} dias sin contacto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
