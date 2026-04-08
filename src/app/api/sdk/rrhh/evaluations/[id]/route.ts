/**
 * Evaluation Detail API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/evaluations/[id] - Get evaluation by ID
 * PUT /api/sdk/rrhh/evaluations/[id] - Update evaluation
 * DELETE /api/sdk/rrhh/evaluations/[id] - Delete evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { EvaluationService } from '@/lib/sdk/modules/rrhh';

export const GET = withAuth(async (request, { params }, auth) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de evaluación requerido' },
        { status: 400 }
      );
    }

    const service = new EvaluationService();
    const evaluation = await service.getById(id);

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: evaluation }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/sdk/rrhh/evaluations/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener evaluación',
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
        { error: 'ID de evaluación requerido' },
        { status: 400 }
      );
    }

    const service = new EvaluationService();

    // Si se proporciona un score, usar el método específico
    if (body.score !== undefined) {
      await service.updateScore(id, body.score, auth.uid);
    } else {
      await service.update(id, body, auth.uid);
    }

    return NextResponse.json(
      { message: 'Evaluación actualizada exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/sdk/rrhh/evaluations/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al actualizar evaluación',
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
        { error: 'ID de evaluación requerido' },
        { status: 400 }
      );
    }

    const service = new EvaluationService();
    await service.delete(id);

    return NextResponse.json(
      { message: 'Evaluación eliminada exitosamente', id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/sdk/rrhh/evaluations/[id]:', error);
    return NextResponse.json(
      {
        error: 'Error al eliminar evaluación',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
