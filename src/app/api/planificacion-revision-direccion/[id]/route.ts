/**
 * API Route: Gestion de revision especifica
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionDireccionService } from '@/services/planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import type { UpdateSectionData } from '@/types/planificacion-revision-direccion';
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
      const revision = await PlanificacionRevisionDireccionService.getById(id);

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
      const { id } = await params;
      console.error(
        `Error en GET /api/planificacion-revision-direccion/${id}:`,
        error
      );
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

      const body = await request.json();
      const data: UpdateSectionData = {
        ...body,
        updated_by: auth.uid,
      };

      if (!data.section) {
        return NextResponse.json(
          { error: 'El campo section es requerido' },
          { status: 400 }
        );
      }

      const updated = await PlanificacionRevisionDireccionService.updateSection(
        id,
        data
      );
      return NextResponse.json(updated);
    } catch (error: any) {
      const { id } = await params;
      console.error(
        `Error en PATCH /api/planificacion-revision-direccion/${id}:`,
        error
      );

      if (error.message?.includes('no existe')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al actualizar la revision' },
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

      await PlanificacionRevisionDireccionService.delete(id);
      return NextResponse.json({ message: 'Revision eliminada exitosamente' });
    } catch (error) {
      const { id } = await params;
      console.error(
        `Error en DELETE /api/planificacion-revision-direccion/${id}:`,
        error
      );
      return NextResponse.json(
        { error: 'Error al eliminar la revision' },
        { status: 500 }
      );
    }
  },
  { roles: [...ADMIN_ROLES] }
);
