import { adminDb } from '@/firebase/admin';
import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/lib/sdk/modules/audits';
import { CreateAuditSchema } from '@/lib/sdk/modules/audits/validations';
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

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const service = new AuditService();
      const filters: any = { organization_id: auth.organizationId };
      if (status) {
        filters.status = status;
      }

      const audits = await service.list(filters, { limit, offset });

      return NextResponse.json(
        {
          success: true,
          data: audits,
          count: audits.length,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in GET /api/sdk/audits:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener auditorias',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const body = await request.json();
      const requestedOrgId =
        (typeof body?.organization_id === 'string'
          ? body.organization_id
          : null) ||
        (typeof body?.organizationId === 'string'
          ? body.organizationId
          : null) ||
        (typeof body?.orgId === 'string' ? body.orgId : null) ||
        (typeof body?.org === 'string' ? body.org : null);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validated = CreateAuditSchema.parse({
        ...body,
        organization_id: auth.organizationId,
      });

      const service = new AuditService();
      const userId = auth.uid;
      const id = await service.createAndReturnId(
        {
          ...validated,
          organization_id: auth.organizationId,
          leadAuditorId: body.leadAuditorId,
          leadAuditorName: body.leadAuditorName || validated.leadAuditor,
        } as any,
        userId
      );

      try {
        const eventId = await EventService.syncFromSource({
          organization_id: auth.organizationId,
          titulo: `Auditoria: ${validated.title}`,
          descripcion: validated.scope,
          tipo_evento: 'auditoria',
          fecha_inicio: validated.plannedDate,
          responsable_id: body.leadAuditorId || '',
          responsable_nombre: body.leadAuditorName || validated.leadAuditor,
          estado: 'programado',
          prioridad: 'alta',
          source_collection: 'audits',
          source_id: id,
          created_by: userId,
        });

        await adminDb
          .collection('audits')
          .doc(id)
          .update({ event_id: eventId });

        console.log(
          `[Audits API] Sincronizado evento ${eventId} para auditoria ${id}`
        );
      } catch (eventError) {
        console.error('Error syncing audit to events:', eventError);
      }

      return NextResponse.json(
        {
          success: true,
          data: { id },
          message: 'Auditoria creada exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/audits:', error);

      if (error instanceof Error && error.name === 'ZodError') {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos de validacion incorrectos',
            details: (error as any).errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Error al crear auditoria',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
