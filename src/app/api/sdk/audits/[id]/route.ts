/**
 * Audit Detail API Route - SDK Unified
 *
 * GET /api/sdk/audits/[id] - Get audit by ID
 * PUT /api/sdk/audits/[id] - Update audit
 * DELETE /api/sdk/audits/[id] - Delete audit
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/lib/sdk/modules/audits';
import { EventService } from '@/services/events/EventService';
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
const SENSITIVE_ROLES = ['admin', 'gerente', 'super_admin'] as const;

function requireOrganization(auth: AuthContext): NextResponse | null {
  if (!auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Sin organizacion',
        message: 'Usuario sin organizacion asignada',
      },
      { status: 403 }
    );
  }
  return null;
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

function getRequestedOrgFromRequest(
  request: NextRequest,
  body?: any
): string | null {
  return (
    (typeof body?.organization_id === 'string' ? body.organization_id : null) ||
    (typeof body?.organizationId === 'string' ? body.organizationId : null) ||
    (typeof body?.orgId === 'string' ? body.orgId : null) ||
    (typeof body?.org === 'string' ? body.org : null) ||
    request.nextUrl.searchParams.get('organization_id') ||
    request.nextUrl.searchParams.get('organizationId') ||
    request.nextUrl.searchParams.get('orgId') ||
    request.nextUrl.searchParams.get('org')
  );
}

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

function resourceOrgId(resource: any): string | null {
  const value = resource?.organization_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const GET = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const requestedOrgId = getRequestedOrgFromRequest(request);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const id = await resolveId(context);

      if (!id) {
        return NextResponse.json(
          { error: 'ID de auditoria requerido' },
          { status: 400 }
        );
      }

      const service = new AuditService();
      const audit = await service.getById(id);

      if (!audit) {
        return NextResponse.json(
          { error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (resourceOrgId(audit) !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: audit }, { status: 200 });
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in GET /api/sdk/audits/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener auditoria',
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
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const id = await resolveId(context);
      const body = await request.json();
      const requestedOrgId = getRequestedOrgFromRequest(request, body);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de auditoria requerido' },
          { status: 400 }
        );
      }

      const service = new AuditService();
      const existingAudit = await service.getById(id);
      if (!existingAudit) {
        return NextResponse.json(
          { error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (resourceOrgId(existingAudit) !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const sanitizedBody = {
        ...body,
        organization_id: auth.organizationId,
      };
      await service.update(id, sanitizedBody, auth.uid);

      try {
        const audit = await service.getById(id);
        if (audit) {
          const plannedDateValue = audit.plannedDate;
          const fechaInicio =
            plannedDateValue &&
            typeof (plannedDateValue as any).toDate === 'function'
              ? (plannedDateValue as any).toDate()
              : new Date(plannedDateValue as any);

          await EventService.syncFromSource({
            organization_id: auth.organizationId,
            titulo: `Auditoria: ${audit.title}`,
            descripcion: audit.scope,
            tipo_evento: 'auditoria',
            fecha_inicio: fechaInicio,
            responsable_id: (audit as any).leadAuditorId || '',
            responsable_nombre: audit.leadAuditor,
            estado: (audit.status === 'planned'
              ? 'programado'
              : audit.status === 'in_progress'
                ? 'en_progreso'
                : audit.status === 'completed'
                  ? 'completado'
                  : 'programado') as any,
            prioridad: 'alta',
            source_collection: 'audits',
            source_id: id,
            created_by: auth.uid,
          });
        }
      } catch (eventError) {
        console.error('Error syncing audit update to events:', eventError);
      }

      return NextResponse.json(
        { message: 'Auditoria actualizada exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in PUT /api/sdk/audits/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar auditoria',
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
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const id = await resolveId(context);
      const requestedOrgId = getRequestedOrgFromRequest(request);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de auditoria requerido' },
          { status: 400 }
        );
      }

      const service = new AuditService();
      const audit = await service.getById(id);

      if (!audit) {
        return NextResponse.json(
          { error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (resourceOrgId(audit) !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.delete(id);

      try {
        await EventService.deleteBySource('audits', id);
      } catch (eventError) {
        console.error('Error deleting event for audit:', eventError);
      }

      return NextResponse.json(
        { message: 'Auditoria eliminada exitosamente', id },
        { status: 200 }
      );
    } catch (error) {
      const id = await resolveId(context);
      console.error(`Error in DELETE /api/sdk/audits/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar auditoria',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SENSITIVE_ROLES] }
);
