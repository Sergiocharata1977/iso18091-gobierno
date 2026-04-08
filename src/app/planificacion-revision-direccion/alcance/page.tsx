'use client';

import { ModulePageShell, ModuleStatePanel } from '@/components/design-system';
import { PlanificacionListing } from '@/components/planificacion/PlanificacionListing';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Target } from 'lucide-react';

export default function AlcancePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <ModulePageShell contentClassName="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </ModulePageShell>
    );
  }

  if (!user?.organization_id) {
    return (
      <ModulePageShell maxWidthClassName="max-w-3xl">
        <ModuleStatePanel
          title="Organizacion no encontrada"
          description="No se pudo resolver la organizacion activa para cargar el alcance."
        />
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell maxWidthClassName="max-w-5xl">
      <PlanificacionListing
        tipo="alcance"
        organizationId={user.organization_id}
        userEmail={user.email || ''}
        icon={Target}
      />
    </ModulePageShell>
  );
}
