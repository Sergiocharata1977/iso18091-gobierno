/**
 * Actions [id] API Routes
 *
 * Endpoints for individual action operations
 * Protected by authentication middleware
 */

import { AuthenticatedRequest, withAuth } from '@/lib/sdk/middleware/auth';
import { ActionService } from '@/services/actions/ActionService';
import { EventService } from '@/services/events/EventService';
import { NextResponse } from 'next/server';

// ============================================
// PUT /api/actions/[id] - Actualizar acción (Authenticated)
// ============================================

export const PUT = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Actualizar acción
      const action = await ActionService.update(id, body);

      // Sincronizar con evento del calendario
      try {
        await EventService.syncFromSource({
          organization_id: (action as any).organization_id || '',
          titulo: `🛠️ Acción: ${action.title}`,
          descripcion: action.description,
          tipo_evento: (action.actionType === 'correctiva'
            ? 'accion_correctiva'
            : action.actionType === 'preventiva'
              ? 'accion_preventiva'
              : 'otro') as any,
          fecha_inicio: action.planning.plannedDate.toDate(),
          responsable_id: action.planning.responsiblePersonId,
          responsable_nombre: action.planning.responsiblePersonName,
          estado: (action.status === 'completada'
            ? 'completado'
            : action.status === 'cancelada'
              ? 'cancelado'
              : 'programado') as any,
          prioridad: (action.priority === 'critica'
            ? 'alta'
            : action.priority === 'alta'
              ? 'alta'
              : 'media') as any,
          source_collection: 'actions',
          source_id: action.id,
          created_by: action.createdBy || 'system',
        });
      } catch (eventError) {
        console.error('Error syncing event for action update:', eventError);
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      console.error('Error in PUT /api/actions/[id]:', error);
      return NextResponse.json(
        { error: 'Error al actualizar acción' },
        { status: 500 }
      );
    }
  }
);

// ============================================
// GET - Obtener acción por ID (Authenticated)
// ============================================

export const GET = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      const action = await ActionService.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Acción no encontrada' },
          { status: 404 }
        );
      }

      // Serializar Timestamps
      const serializedAction = {
        ...action,
        planning: {
          ...action.planning,
          plannedDate: action.planning.plannedDate.toDate().toISOString(),
        },
        execution: action.execution
          ? {
              ...action.execution,
              executionDate:
                action.execution.executionDate?.toDate().toISOString() || null,
            }
          : null,
        controlPlanning: action.controlPlanning
          ? {
              ...action.controlPlanning,
              plannedDate: action.controlPlanning.plannedDate
                .toDate()
                .toISOString(),
            }
          : null,
        controlExecution: action.controlExecution
          ? {
              ...action.controlExecution,
              executionDate:
                action.controlExecution.executionDate?.toDate().toISOString() ||
                null,
            }
          : null,
        createdAt: action.createdAt.toDate().toISOString(),
        updatedAt: action.updatedAt.toDate().toISOString(),
      };

      return NextResponse.json(serializedAction);
    } catch (error) {
      console.error('Error in GET /api/actions/[id]:', error);
      return NextResponse.json(
        { error: 'Error al obtener la acción' },
        { status: 500 }
      );
    }
  }
);

// ============================================
// DELETE - Eliminar acción (Authenticated)
// ============================================

export const DELETE = withAuth(
  async (
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      // Get user from authenticated context
      const userId = req.user.uid;
      const userName = req.user.email || 'Usuario';

      const { id } = await params;
      await ActionService.delete(id, userId, userName);

      // Eliminar evento asociado del calendario
      try {
        await EventService.deleteBySource('actions', id);
      } catch (eventError) {
        console.error('Error deleting event for action:', eventError);
      }

      return NextResponse.json({ message: 'Acción eliminada exitosamente' });
    } catch (error) {
      console.error('Error in DELETE /api/actions/[id]:', error);
      return NextResponse.json(
        { error: 'Error al eliminar la acción' },
        { status: 500 }
      );
    }
  }
);
