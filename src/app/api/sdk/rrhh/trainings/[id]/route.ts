/**
 * Training Detail API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/trainings/[id] - Get training by ID
 * PUT /api/sdk/rrhh/trainings/[id] - Update training
 * DELETE /api/sdk/rrhh/trainings/[id] - Delete training
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { TrainingService } from '@/lib/sdk/modules/rrhh';
const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denyByOrg(
  auth: { role: string; organizationId: string },
  item: unknown
) {
  if (auth.role === 'super_admin') return false;
  if (!auth.organizationId) return true;
  const data = item as {
    organization_id?: string;
    organizationId?: string;
  } | null;
  const orgId =
    (data?.organization_id as string | undefined) ||
    (data?.organizationId as string | undefined) ||
    null;
  return !orgId || orgId !== auth.organizationId;
}

export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de entrenamiento requerido' },
          { status: 400 }
        );
      }

      const service = new TrainingService();
      const training = await service.getById(id);

      if (!training) {
        return NextResponse.json(
          { error: 'Entrenamiento no encontrado' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, training as unknown)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: training }, { status: 200 });
    } catch (error) {
      console.error('Error in GET /api/sdk/rrhh/trainings/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener entrenamiento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;
      const body = await request.json();

      if (!id) {
        return NextResponse.json(
          { error: 'ID de entrenamiento requerido' },
          { status: 400 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        (body?.organization_id || body?.organizationId) &&
        (body.organization_id || body.organizationId) !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const service = new TrainingService();
      const current = await service.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Entrenamiento no encontrado' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, current as unknown)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.update(id, body, auth.uid);

      return NextResponse.json(
        { message: 'Entrenamiento actualizado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in PUT /api/sdk/rrhh/trainings/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al actualizar entrenamiento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const { id } = await params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de entrenamiento requerido' },
          { status: 400 }
        );
      }

      const service = new TrainingService();
      const current = await service.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Entrenamiento no encontrado' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, current as unknown)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      return NextResponse.json(
        { message: 'Entrenamiento eliminado exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in DELETE /api/sdk/rrhh/trainings/[id]:', error);
      return NextResponse.json(
        {
          error: 'Error al eliminar entrenamiento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
