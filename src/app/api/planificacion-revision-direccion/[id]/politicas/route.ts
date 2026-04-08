/**
 * API Route: Gestion de politicas dentro de una revision
 */

import { withAuth } from '@/lib/api/withAuth';
import { PlanificacionRevisionDireccionService } from '@/services/planificacion-revision-direccion/PlanificacionRevisionDireccionService';
import type {
  CreatePoliticaData,
  UpdatePoliticaData,
} from '@/types/planificacion-revision-direccion';
import { NextResponse } from 'next/server';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string | null
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const POST = withAuth(
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
      const data: CreatePoliticaData = body;

      if (!data.codigo || !data.titulo) {
        return NextResponse.json(
          { error: 'Codigo y titulo son requeridos' },
          { status: 400 }
        );
      }

      const updated = await PlanificacionRevisionDireccionService.addPolitica(
        id,
        data
      );
      return NextResponse.json(updated, { status: 201 });
    } catch (error: any) {
      const { id } = await params;
      console.error(
        `Error en POST /api/planificacion-revision-direccion/${id}/politicas:`,
        error
      );

      if (error.message?.includes('no existe')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al agregar la politica' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
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
      const data: UpdatePoliticaData = body;

      if (!data.id) {
        return NextResponse.json(
          { error: 'El ID de la politica es requerido' },
          { status: 400 }
        );
      }

      const updated =
        await PlanificacionRevisionDireccionService.updatePolitica(id, data);
      return NextResponse.json(updated);
    } catch (error: any) {
      const { id } = await params;
      console.error(
        `Error en PATCH /api/planificacion-revision-direccion/${id}/politicas:`,
        error
      );

      if (error.message?.includes('no existe')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al actualizar la politica' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
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

      const { searchParams } = new URL(request.url);
      const politicaId = searchParams.get('politicaId');

      if (!politicaId) {
        return NextResponse.json(
          { error: 'El ID de la politica es requerido' },
          { status: 400 }
        );
      }

      const updated =
        await PlanificacionRevisionDireccionService.deletePolitica(
          id,
          politicaId
        );
      return NextResponse.json(updated);
    } catch (error: any) {
      const { id } = await params;
      console.error(
        `Error en DELETE /api/planificacion-revision-direccion/${id}/politicas:`,
        error
      );

      if (error.message?.includes('no existe')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al eliminar la politica' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
