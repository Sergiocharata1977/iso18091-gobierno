/**
 * Personnel API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/personnel - List personnel
 * POST /api/sdk/rrhh/personnel - Create personnel
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { PersonnelService } from '@/lib/sdk/modules/rrhh';
import { CreatePersonnelSchema } from '@/lib/sdk/modules/rrhh/validations';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const positionId = searchParams.get('positionId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const service = new PersonnelService();
    let personnel;

    if (departmentId) {
      personnel = await service.getByDepartment(departmentId);
    } else if (positionId) {
      personnel = await service.getByPosition(positionId);
    } else {
      personnel = await service.list({}, { limit, offset });
    }

    return NextResponse.json(
      { data: personnel, count: personnel.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/personnel:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener personal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const validated = CreatePersonnelSchema.parse(body);

    const service = new PersonnelService();
    const id = await service.createAndReturnId(validated, auth.uid);

    return NextResponse.json(
      { id, message: 'Personal creado exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sdk/rrhh/personnel:', error);
    return NextResponse.json(
      {
        error: 'Error al crear personal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
