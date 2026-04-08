import { withAuth } from '@/lib/api/withAuth';
import { SagaService } from '@/services/agents/SagaService';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }, auth) => {
  try {
    const { id } = await params;
    const saga = await SagaService.getSagaById(id);

    if (!saga) {
      return NextResponse.json(
        { error: 'Saga no encontrada' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      saga.organization_id &&
      saga.organization_id !== auth.organizationId
    ) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    return NextResponse.json(
      {
        id: saga.id,
        organization_id: saga.organization_id,
        user_id: saga.user_id,
        goal: saga.goal,
        status: saga.status,
        current_step_index: saga.current_step_index,
        steps: saga.steps,
        context: saga.context,
        created_at: saga.created_at,
        updated_at: saga.updated_at,
        completed_at: saga.completed_at ?? null,
        error: saga.error ?? null,
        current_step: SagaService.getCurrentStep(saga),
        timeline: SagaService.buildTimelineItems(saga),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching saga timeline:', error);
    return NextResponse.json(
      { error: 'Error al obtener saga' },
      { status: 500 }
    );
  }
});
