/**
 * Competency Detail API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/competencies/[id] - Get competency by ID
 * PUT /api/sdk/rrhh/competencies/[id] - Update competency
 * DELETE /api/sdk/rrhh/competencies/[id] - Delete competency
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { CompetenceService } from '@/lib/sdk/modules/rrhh';

export const GET = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de competencia requerido' },
        { status: 400 }
      );
    }

    const service = new CompetenceService();
    const competency = await service.getById(id);

    if (!competency) {
      return NextResponse.json(
        { error: 'Competencia no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: competency }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/competencies/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener competencia',
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
        { error: 'ID de competencia requerido' },
        { status: 400 }
      );
    }

    const service = new CompetenceService();
    await service.update(id, body, auth.uid);

    return NextResponse.json(
      { message: 'Competencia actualizada exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sdk/rrhh/competencies/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar competencia',
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
        { error: 'ID de competencia requerido' },
        { status: 400 }
      );
    }

    const service = new CompetenceService();
    await service.delete(id);

    return NextResponse.json(
      { message: 'Competencia eliminada exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sdk/rrhh/competencies/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar competencia',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
