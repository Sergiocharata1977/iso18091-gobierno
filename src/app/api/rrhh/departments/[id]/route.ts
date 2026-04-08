import { withAuth } from '@/lib/api/withAuth';
import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { departmentSchema } from '@/lib/validations/rrhh';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const department = await DepartmentService.getById(id);

      if (!department) {
        return NextResponse.json(
          { error: 'Departamento no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (department as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(department);
    } catch (error) {
      console.error('Error in department GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener departamento' },
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
      const current = await DepartmentService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Departamento no encontrado' },
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
      const validatedData = departmentSchema.parse({
        ...body,
        organization_id: (current as any).organization_id,
      });

      const department = await DepartmentService.update(id, validatedData);

      return NextResponse.json(department);
    } catch (error) {
      console.error('Error in department PUT:', error);

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
        { error: 'Error al actualizar departamento' },
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
      const current = await DepartmentService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Departamento no encontrado' },
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
      await DepartmentService.delete(id);

      return NextResponse.json({
        message: 'Departamento eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error in department DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar departamento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

// PATCH for toggling active status
export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await DepartmentService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Departamento no encontrado' },
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

      if (body.action === 'toggle_active') {
        const department = await DepartmentService.toggleActive(id);
        return NextResponse.json(department);
      }

      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error) {
      console.error('Error in department PATCH:', error);
      return NextResponse.json(
        { error: 'Error al actualizar departamento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
