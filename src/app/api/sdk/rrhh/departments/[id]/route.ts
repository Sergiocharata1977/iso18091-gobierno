/**
 * Department Detail API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/departments/[id] - Get department by ID
 * PUT /api/sdk/rrhh/departments/[id] - Update department
 * DELETE /api/sdk/rrhh/departments/[id] - Delete department
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { DepartmentService } from '@/lib/sdk/modules/rrhh';

export const GET = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de departamento requerido' },
        { status: 400 }
      );
    }

    const service = new DepartmentService();
    const department = await service.getById(id);

    if (!department) {
      return NextResponse.json(
        { error: 'Departamento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: department }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/departments/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener departamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID de departamento requerido' },
        { status: 400 }
      );
    }

    const service = new DepartmentService();
    await service.update(id, body, auth.uid);

    return NextResponse.json(
      { message: 'Departamento actualizado exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sdk/rrhh/departments/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar departamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de departamento requerido' },
        { status: 400 }
      );
    }

    const service = new DepartmentService();
    await service.delete(id);

    return NextResponse.json(
      { message: 'Departamento eliminado exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sdk/rrhh/departments/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar departamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
