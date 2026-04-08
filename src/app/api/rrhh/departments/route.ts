import { withAuth } from '@/lib/api/withAuth';
import {
  departmentFiltersSchema,
  departmentFormSchema,
  paginationSchema,
} from '@/lib/validations/rrhh';
import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);

      // Parse filters
      const filters = departmentFiltersSchema.parse({
        search: searchParams.get('search') || undefined,
        is_active:
          searchParams.get('is_active') === 'true'
            ? true
            : searchParams.get('is_active') === 'false'
              ? false
              : undefined,
      });

      // Parse pagination
      const pagination = paginationSchema.parse({
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '10'),
        sort: searchParams.get('sort') || undefined,
        order: searchParams.get('order') || 'desc',
      });

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

      const result = await DepartmentService.getPaginated(
        organizationId,
        filters,
        pagination
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in departments GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener departamentos' },
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
      const validatedData = departmentFormSchema.parse({
        ...body,
        organization_id: organizationId,
      });

      const department = await DepartmentService.create(
        validatedData,
        organizationId
      );

      return NextResponse.json(department, { status: 201 });
    } catch (error) {
      console.error('Error in departments POST:', error);

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
        { error: 'Error al crear departamento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
