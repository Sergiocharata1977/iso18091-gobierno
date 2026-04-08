/**
 * API Route: /api/planificacion-revision-direccion/v2/[id]
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionV2Service } from '@/services/planificacion-revision-direccion/PlanificacionRevisionV2Service';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;
const ADMIN_ROLES = ['admin', 'gerente', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string | null
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const revision = await PlanificacionRevisionV2Service.getById(id);

      if (!revision) {
        return NextResponse.json(
          { error: 'Revision no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (revision as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(revision);
    } catch (error) {
      console.error('Error al obtener revision V2:', error);
      return NextResponse.json(
        { error: 'Error al obtener la revision' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
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

      const updateData = await request.json();
      const updated = await PlanificacionRevisionV2Service.updateSection(id, {
        ...updateData,
        updated_by: auth.uid,
      });

      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error al actualizar seccion:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la seccion' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
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

      await PlanificacionRevisionV2Service.delete(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar revision:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la revision' },
        { status: 500 }
      );
    }
  },
  { roles: [...ADMIN_ROLES] }
);
