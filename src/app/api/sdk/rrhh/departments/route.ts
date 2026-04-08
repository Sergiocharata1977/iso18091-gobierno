/**
 * Departments API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/departments - List departments
 * POST /api/sdk/rrhh/departments - Create department
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { DepartmentService } from '@/lib/sdk/modules/rrhh';
import { CreateDepartmentSchema } from '@/lib/sdk/modules/rrhh/validations';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get('managerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const service = new DepartmentService();
    let departments;

    if (managerId) {
      departments = await service.getByManager(managerId);
    } else {
      departments = await service.list({}, { limit, offset });
    }

    return NextResponse.json(
      { data: departments, count: departments.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/departments:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener departamentos',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const validated = CreateDepartmentSchema.parse(body);

    const service = new DepartmentService();
    const id = await service.createAndReturnId(validated, auth.uid);

    return NextResponse.json(
      { id, message: 'Departamento creado exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sdk/rrhh/departments:', error);
    return NextResponse.json(
      {
        error: 'Error al crear departamento',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
