'use client';

import { PageHeader } from '@/components/design-system/layout/PageHeader';
import { NormPointFormDialog } from '@/components/normPoints/NormPointFormDialog';
import { NormPointsList } from '@/components/normPoints/NormPointsList';
import { Button } from '@/components/ui/button';
import { NormPoint } from '@/types/normPoints';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function PuntosNormaPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNormPoint, setEditingNormPoint] = useState<NormPoint | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNewPoint = () => {
    setEditingNormPoint(null);
    setIsFormOpen(true);
  };

  const handleEditPoint = (point: NormPoint) => {
    setEditingNormPoint(point);
    setIsFormOpen(true);
  };

  const handleSeedISO = async () => {
    if (
      confirm(
        '¿Cargar todos los puntos de ISO 9001:2015? (Solo se crearán los que no existan)'
      )
    ) {
      try {
        const response = await fetch('/api/seed/iso-9001', {
          method: 'POST',
        });
        const data = await response.json();
        alert(
          `${data.message}\nCreados: ${data.created}\nOmitidos: ${data.skipped}`
        );
        handleRefresh();
      } catch {
        alert('Error al cargar puntos ISO 9001');
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Puntos de Norma"
        subtitle="Gestión de requisitos normativos ISO 9001:2015"
        breadcrumbs={[{ label: 'Puntos de Norma' }]}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeedISO}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 hidden sm:flex"
          >
            📘 Cargar ISO 9001
          </Button>
          <Button
            onClick={handleNewPoint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Punto
          </Button>
        </div>
      </PageHeader>

      <div className="px-6">
        <p className="text-sm text-slate-500 mb-6">
          💡 Para ver el Dashboard de Cumplimiento y Análisis de Gaps, visita el{' '}
          <a
            href="/noticias"
            className="text-emerald-600 hover:underline font-medium"
          >
            Centro Principal
          </a>
        </p>

        <NormPointsList refreshKey={refreshKey} onEdit={handleEditPoint} />
      </div>

      <NormPointFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        normPoint={editingNormPoint}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingNormPoint(null);
          handleRefresh();
        }}
      />
    </div>
  );
}
