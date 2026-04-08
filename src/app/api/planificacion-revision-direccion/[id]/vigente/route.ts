/**
 * API Route: Marcar revision como vigente
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionDireccionService } from '@/services/planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import { NextResponse } from 'next/server';

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string | null
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const PATCH = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PlanificacionRevisionDireccionService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Revision no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const updated =
        await PlanificacionRevisionDireccionService.markAsVigente(id);
      return NextResponse.json(updated);
    } catch (error) {
      const { id } = await params;
      console.error(
        `Error en PATCH /api/planificacion-revision-direccion/${id}/vigente:`,
        error
      );
      return NextResponse.json(
        { error: 'Error al marcar la revision como vigente' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
