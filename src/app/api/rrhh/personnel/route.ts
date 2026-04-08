import { withAuth } from '@/lib/api/withAuth';
import {
  paginationSchema,
  personnelFiltersSchema,
  personnelSchema,
} from '@/lib/validations/rrhh';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
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
      const filters = personnelFiltersSchema.parse({
        organization_id: organizationId,
        search: searchParams.get('search') || undefined,
        estado:
          (searchParams.get('estado') as 'Activo' | 'Inactivo' | 'Licencia') ||
          undefined,
        tipo_personal: (searchParams.get('tipo_personal') as any) || undefined,
        supervisor_id: searchParams.get('supervisor_id') || undefined,
      });

      // Parse pagination
      const pagination = paginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
        sort: searchParams.get('sort') || undefined,
        order: searchParams.get('order') || 'desc',
      });

      const result = await PersonnelService.getPaginated(
        organizationId,
        filters,
        pagination
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in personnel GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener personal' },
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
          { error: 'organization_id es requerido' },
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

      const validatedData = personnelSchema.parse({
        ...body,
        organization_id: organizationId,
      });

      const personnel = await PersonnelService.create(
        validatedData,
        organizationId
      );

      return NextResponse.json(personnel, { status: 201 });
    } catch (error) {
      console.error('Error in personnel POST:', error);

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
        { error: 'Error al crear personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
