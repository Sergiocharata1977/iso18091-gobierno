import { withAuth } from '@/lib/api/withAuth';
import { PositionService } from '@/services/rrhh/PositionService';
import { positionSchema } from '@/lib/validations/rrhh';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const position = await PositionService.getById(id);

      if (!position) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (position as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(position);
    } catch (error) {
      console.error('Error in position GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PositionService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      const body = await request.json();
      const requestedOrgId = body.organization_id as string | undefined;
      if (
        auth.role !== 'super_admin' &&
        requestedOrgId &&
        requestedOrgId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      const validatedData = positionSchema.parse({
        ...body,
        organization_id: (current as any).organization_id,
      });

      const position = await PositionService.update(id, validatedData);

      return NextResponse.json(position);
    } catch (error) {
      console.error('Error in position PUT:', error);

      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: (error as any).errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Error al actualizar puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PositionService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await PositionService.delete(id);

      return NextResponse.json({ message: 'Puesto eliminado exitosamente' });
    } catch (error) {
      console.error('Error in position DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
