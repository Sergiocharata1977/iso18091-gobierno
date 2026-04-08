/**
 * Evaluations API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/evaluations - List evaluations
 * POST /api/sdk/rrhh/evaluations - Create evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { EvaluationService } from '@/lib/sdk/modules/rrhh';
import { CreateEvaluationSchema } from '@/lib/sdk/modules/rrhh/validations';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const personnelId = searchParams.get('personnelId');
    const evaluatorId = searchParams.get('evaluatorId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const service = new EvaluationService();
    let evaluations;

    if (personnelId) {
      evaluations = await service.getByPersonnel(personnelId);
    } else if (evaluatorId) {
      evaluations = await service.getByEvaluator(evaluatorId);
    } else {
      evaluations = await service.list({}, { limit, offset });
    }

    return NextResponse.json(
      { data: evaluations, count: evaluations.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/evaluations:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener evaluaciones',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const validated = CreateEvaluationSchema.parse(body);

    const service = new EvaluationService();
    const id = await service.createAndReturnId(validated, auth.uid);

    return NextResponse.json(
      { id, message: 'Evaluación creada exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sdk/rrhh/evaluations:', error);
    return NextResponse.json(
      {
        error: 'Error al crear evaluación',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
