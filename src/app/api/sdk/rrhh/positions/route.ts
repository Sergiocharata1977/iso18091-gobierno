/**
 * Positions API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/positions - List positions
 * POST /api/sdk/rrhh/positions - Create position
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { PositionService } from '@/lib/sdk/modules/rrhh';
import { CreatePositionSchema } from '@/lib/sdk/modules/rrhh/validations';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const service = new PositionService();
    let positions;

    if (departmentId) {
      positions = await service.getByDepartment(departmentId);
    } else {
      positions = await service.list({}, { limit, offset });
    }

    return NextResponse.json(
      { data: positions, count: positions.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/positions:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener posiciones',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const validated = CreatePositionSchema.parse(body);

    const service = new PositionService();
    const id = await service.createAndReturnId(validated, auth.uid);

    return NextResponse.json(
      { id, message: 'Posición creada exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sdk/rrhh/positions:', error);
    return NextResponse.json(
      {
        error: 'Error al crear posición',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
