import { withAuth } from '@/lib/api/withAuth';
import {
  paginationSchema,
  positionFiltersSchema,
  positionSchema,
} from '@/lib/validations/rrhh';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);

      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      // Parse filters
      const filters = positionFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        departamento_id: searchParams.get('departamento_id') || undefined,
        reporta_a_id: searchParams.get('reporta_a_id') || undefined,
      });

      // Parse pagination
      const pagination = paginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
        sort: searchParams.get('sort') || undefined,
        order: searchParams.get('order') || 'desc',
      });

      const result = await PositionService.getAll(organizationId);

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in positions GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener puestos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const requestedOrgId = body.organization_id as string | undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization ID is required' },
          { status: 400 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        requestedOrgId &&
        requestedOrgId !== organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      const validatedData = positionSchema.parse({
        ...body,
        organization_id: organizationId,
      });

      const position = await PositionService.create(
        validatedData,
        organizationId
      );

      return NextResponse.json(position, { status: 201 });
    } catch (error) {
      console.error('Error in positions POST:', error);

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
        { error: 'Error al crear puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
