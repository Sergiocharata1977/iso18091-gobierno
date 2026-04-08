/**
 * Actions API Routes
 *
 * Endpoints for managing corrective/preventive actions
 * Protected by authentication middleware
 */

import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { ActionFormSchema } from '@/lib/validations/actions';
import { ActionService } from '@/services/actions/ActionService';
import { EventService } from '@/services/events/EventService';
import type { ActionPriority, ActionStatus, ActionType } from '@/types/actions';
import { NextResponse } from 'next/server';

// ============================================
// GET - Listar acciones (Authenticated)
// ============================================

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    const organizationId = auth.organizationId;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    const filters = {
      organization_id: organizationId,
      status: (searchParams.get('status') as ActionStatus) || undefined,
      actionType: (searchParams.get('actionType') as ActionType) || undefined,
      priority: (searchParams.get('priority') as ActionPriority) || undefined,
      responsiblePersonId: searchParams.get('responsiblePersonId') || undefined,
      processId: searchParams.get('processId') || undefined,
      findingId: searchParams.get('findingId') || undefined,
      year: searchParams.get('year')
        ? parseInt(searchParams.get('year')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    };

    const pageSize = searchParams.get('pageSize')
      ? parseInt(searchParams.get('pageSize')!)
      : 50;

    const result = await ActionService.list(organizationId, filters, pageSize);

    // Serializar Timestamps a ISO strings
    const serializedActions = result.actions.map(action => ({
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
    }));

    return NextResponse.json({
      actions: serializedActions,
    });
  } catch (error) {
    console.error('Error in GET /api/actions:', error);
    return NextResponse.json(
      { error: 'Error al obtener las acciones' },
      { status: 500 }
    );
  }
});

// ============================================
// POST - Crear acción (Authenticated)
// ============================================

export const POST = withAuth(async (request, _context, auth) => {
  try {
    // Get user from authenticated context
    const userId = auth.uid;
    const userName = auth.email;

    const body = await request.json();

    // MULTI-TENANT: Usar organization_id del usuario autenticado
    const organizationId = auth.organizationId;
    if (!organizationId && auth.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    // Asegurar que la acción se cree en la organización del usuario
    body.organization_id = organizationId;

    // Convertir fechas de string a Date
    if (body.plannedExecutionDate) {
      body.plannedExecutionDate = new Date(body.plannedExecutionDate);
    }
    if (body.plannedVerificationDate) {
      body.plannedVerificationDate = new Date(body.plannedVerificationDate);
    }

    // Validar datos
    const validatedData = ActionFormSchema.parse(body);

    // Crear acción
    const actionId = await ActionService.create(
      validatedData,
      userId,
      userName,
      validatedData.organization_id
    );

    // Sincronizar con colección events unificada
    try {
      const tipoEvento =
        validatedData.actionType === 'correctiva'
          ? 'accion_correctiva'
          : validatedData.actionType === 'preventiva'
            ? 'accion_preventiva'
            : 'otro';

      const eventId = await EventService.syncFromSource({
        organization_id: body.organization_id,
        titulo: `⚙️ Acción ${validatedData.actionType}: ${validatedData.title}`,
        descripcion: validatedData.description,
        tipo_evento: tipoEvento as any,
        fecha_inicio: new Date(),
        fecha_fin: validatedData.plannedExecutionDate,
        responsable_id: validatedData.implementationResponsibleId,
        responsable_nombre: validatedData.implementationResponsibleName,
        estado: 'programado',
        prioridad: validatedData.priority as any,
        source_collection: 'actions',
        source_id: actionId,
        created_by: userId,
      });

      // Actualizar acción con event_id usando adminDb
      await adminDb
        .collection('actions')
        .doc(actionId)
        .update({ event_id: eventId });
    } catch (eventError) {
      console.error('Error syncing action to events:', eventError);
    }

    return NextResponse.json(
      { id: actionId, message: 'Acción creada exitosamente' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/actions:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear la acción' },
      { status: 500 }
    );
  }
});
