/**
 * Calendar Event by ID API Routes - SDK Unified
 *
 * GET /api/sdk/calendar/events/[id] - Get event by ID
 * PUT /api/sdk/calendar/events/[id] - Update event
 * DELETE /api/sdk/calendar/events/[id] - Delete event
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { CalendarService } from '@/lib/sdk/modules/calendar';
import { NextRequest, NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function getRequestedOrgId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
}

function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (!requestedOrgId) return null;
  if (requestedOrgId !== auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Acceso denegado',
        message: 'No puedes operar sobre otra organizacion',
      },
      { status: 403 }
    );
  }
  return null;
}

function isRecordAllowedByOrg(record: any, organizationId: string): boolean {
  const recordOrg = record?.organization_id || record?.organizationId || null;
  return recordOrg === organizationId;
}

export const GET = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;
      const { id } = await context.params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de evento requerido' },
          { status: 400 }
        );
      }

      const service = new CalendarService();
      const event = await service.getById(id);

      if (!event) {
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      }
      if (!isRecordAllowedByOrg(event, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes acceder a recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ event });
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in GET /api/sdk/calendar/events/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;
      await context.params;

      return NextResponse.json(
        { error: 'Actualizacion de eventos no implementada' },
        { status: 501 }
      );
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in PUT /api/sdk/calendar/events/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;
      const { id } = await context.params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de evento requerido' },
          { status: 400 }
        );
      }

      const service = new CalendarService();
      const event = await service.getById(id);

      if (!event) {
        return NextResponse.json(
          { error: 'Evento no encontrado' },
          { status: 404 }
        );
      }
      if (!isRecordAllowedByOrg(event, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes eliminar recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      await service.delete(id);

      return NextResponse.json({
        message: 'Evento eliminado exitosamente',
        id,
      });
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in DELETE /api/sdk/calendar/events/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar evento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
