/**
 * Competencies API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/competencies - List competencies
 * POST /api/sdk/rrhh/competencies - Create competency
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { CompetenceService } from '@/lib/sdk/modules/rrhh';
import { CreateCompetenceSchema } from '@/lib/sdk/modules/rrhh/validations';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const service = new CompetenceService();
    let competencies;

    if (category) {
      competencies = await service.getByCategory(category);
    } else if (level) {
      competencies = await service.getByLevel(level);
    } else {
      competencies = await service.list({}, { limit, offset });
    }

    return NextResponse.json(
      { data: competencies, count: competencies.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/competencies:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener competencias',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = await request.json();
    const validated = CreateCompetenceSchema.parse(body);

    const service = new CompetenceService();
    const id = await service.createAndReturnId(validated, auth.uid);

    return NextResponse.json(
      { id, message: 'Competencia creada exitosamente' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/sdk/rrhh/competencies:', error);
    return NextResponse.json(
      {
        error: 'Error al crear competencia',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
