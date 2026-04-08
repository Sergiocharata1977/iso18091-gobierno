'use client';

import { CriterioCard } from '@/components/crm/clasificaciones/CriterioCard';
import { EditarCriterioDialog } from '@/components/crm/clasificaciones/EditarCriterioDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { CriterioClasificacion } from '@/types/crm-clasificacion';
import { Loader2, Settings2, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { CriterioFormValues } from '@/components/crm/clasificaciones/OpcionesEditor';

export default function CRMClasificacionesConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const [criterios, setCriterios] = useState<CriterioClasificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [criterioEnEdicion, setCriterioEnEdicion] =
    useState<CriterioClasificacion | null>(null);

  const organizationId = user?.organization_id;

  const loadCriterios = useCallback(async () => {
    if (!organizationId) {
      setError('No se encontró la organización del usuario');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/crm/clasificaciones?organization_id=${organizationId}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron cargar los criterios');
      }

      setCriterios(data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading clasificaciones:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los criterios'
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (authLoading) return;
    void loadCriterios();
  }, [authLoading, loadCriterios]);

  const handleCrear = () => {
    setCriterioEnEdicion(null);
    setDialogOpen(true);
  };

  const handleEditar = (criterio: CriterioClasificacion) => {
    setCriterioEnEdicion(criterio);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: CriterioFormValues) => {
    if (!organizationId) {
      throw new Error('No se encontró la organización del usuario');
    }

    try {
      setSaving(true);

      const endpoint = criterioEnEdicion
        ? `/api/crm/clasificaciones/${criterioEnEdicion.id}`
        : '/api/crm/clasificaciones';

      const method = criterioEnEdicion ? 'PATCH' : 'POST';
      const payload = criterioEnEdicion
        ? {
            organization_id: organizationId,
            nombre: values.nombre,
            aplica_a_clientes: values.aplica_a_clientes,
            aplica_a_oportunidades: values.aplica_a_oportunidades,
            opciones: values.opciones,
          }
        : {
            organization_id: organizationId,
            ...values,
            slug: values.slug,
          };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar el criterio');
      }

      setDialogOpen(false);
      setCriterioEnEdicion(null);
      await loadCriterios();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (criterio: CriterioClasificacion) => {
    if (!organizationId) return;

    const confirmed = window.confirm(
      `¿Desactivar el criterio "${criterio.nombre}"?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/crm/clasificaciones/${criterio.id}?organization_id=${organizationId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo desactivar el criterio');
      }

      await loadCriterios();
    } catch (err) {
      console.error('Error deactivating criterio:', err);
      window.alert(
        err instanceof Error
          ? err.message
          : 'No se pudo desactivar el criterio'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-red-600" />
          <p className="mt-3 text-sm text-zinc-500">
            Cargando configuración de clasificaciones...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <Settings2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">
                  Configuración de clasificaciones
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-zinc-500 md:text-base">
                  Definí los criterios con los que clasificarás clientes y
                  oportunidades.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCrear}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              + Nuevo criterio
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {criterios.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
              <SlidersHorizontal className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              No hay criterios activos
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Creá tu primer criterio para segmentar clientes y oportunidades en
              el CRM.
            </p>
            <Button
              type="button"
              onClick={handleCrear}
              className="mt-6 bg-red-600 text-white hover:bg-red-700"
            >
              + Nuevo criterio
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {criterios.map(criterio => (
              <CriterioCard
                key={criterio.id}
                criterio={criterio}
                onEdit={handleEditar}
                onDeactivate={handleDeactivate}
                disabled={saving}
              />
            ))}
          </div>
        )}
      </div>

      <EditarCriterioDialog
        open={dialogOpen}
        criterio={criterioEnEdicion}
        loading={saving}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            setCriterioEnEdicion(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
