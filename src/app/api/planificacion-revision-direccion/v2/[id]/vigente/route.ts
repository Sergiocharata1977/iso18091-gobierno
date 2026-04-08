/**
 * API Route: PATCH /api/planificacion-revision-direccion/v2/[id]/vigente
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionV2Service } from '@/services/planificacion-revision-direccion/PlanificacionRevisionV2Service';
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
      const current = await PlanificacionRevisionV2Service.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Revision no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const updated = await PlanificacionRevisionV2Service.markAsVigente(id);
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error al marcar como vigente:', error);
      return NextResponse.json(
        { error: 'Error al marcar como vigente' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
