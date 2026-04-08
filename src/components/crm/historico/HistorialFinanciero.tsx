'use client';

/**
 * Panel de Historial Financiero
 * Muestra snapshots históricos con posibilidad de agregar nuevos
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { FinancialSnapshot } from '@/types/crm-historico';
import { FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
// import { EstadoResultadosForm } from './EstadoResultadosForm';
import { EstadoResultadosForm } from './EstadoResultadosForm';
import { FinancialSnapshotCard } from './FinancialSnapshotCard';
import { ImpuestosMensualesForm } from './ImpuestosMensualesForm';
import { SituacionPatrimonialForm } from './SituacionPatrimonialForm';

interface HistorialFinancieroProps {
  clienteId: string;
  usuarioActual: {
    userId: string;
    nombre: string;
    cargo?: string;
  };
}

export function HistorialFinanciero({
  clienteId,
  usuarioActual,
}: HistorialFinancieroProps) {
  const { user } = useAuth();
  const organizationId = user?.organization_id || '';

  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // Control de diálogos
  const [showSituacionPatrimonial, setShowSituacionPatrimonial] =
    useState(false);
  const [showEstadoResultados, setShowEstadoResultados] = useState(false);
  const [showImpuestosMensuales, setShowImpuestosMensuales] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, [clienteId]);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/crm/historico/${clienteId}/financial?limite=12`
      );
      const data = await res.json();
      if (data.success) {
        setSnapshots(data.data);
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-gray-500">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial Financiero
            </CardTitle>
            <CardDescription>
              Balances, IVA, Ganancias - Registros históricos
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSituacionPatrimonial(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Situación Patrimonial
            </Button>
            <Button
              onClick={() => setShowEstadoResultados(true)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Estado de Resultados
            </Button>
            <Button onClick={() => setShowImpuestosMensuales(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Impuestos Mensuales
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay estados financieros registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshots.map(snapshot => (
                <FinancialSnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  onClick={() => {
                    // TODO: Implementar detalle
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showSituacionPatrimonial && (
        <SituacionPatrimonialForm
          open={showSituacionPatrimonial}
          onOpenChange={setShowSituacionPatrimonial}
          organizationId={organizationId}
          clienteId={clienteId}
          usuarioActual={usuarioActual}
          onSuccess={loadSnapshots}
        />
      )}

      {showEstadoResultados && (
        <EstadoResultadosForm
          open={showEstadoResultados}
          onOpenChange={setShowEstadoResultados}
          organizationId={organizationId}
          clienteId={clienteId}
          usuarioActual={usuarioActual}
          onSuccess={loadSnapshots}
        />
      )}

      {showImpuestosMensuales && (
        <ImpuestosMensualesForm
          open={showImpuestosMensuales}
          onOpenChange={setShowImpuestosMensuales}
          organizationId={organizationId}
          clienteId={clienteId}
          usuarioActual={usuarioActual}
          onSuccess={loadSnapshots}
        />
      )}
    </>
  );
}
