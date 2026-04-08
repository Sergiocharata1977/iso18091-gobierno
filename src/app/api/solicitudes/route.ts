import { withAuth } from '@/lib/api/withAuth';
import { SolicitudListQuerySchema } from '@/lib/validations/solicitudes';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const query = SolicitudListQuerySchema.parse({
        tipo: request.nextUrl.searchParams.get('tipo') || undefined,
        flujo: request.nextUrl.searchParams.get('flujo') || undefined,
        estado: request.nextUrl.searchParams.get('estado') || undefined,
        estado_operativo:
          request.nextUrl.searchParams.get('estado_operativo') || undefined,
        dateFrom: request.nextUrl.searchParams.get('dateFrom') || undefined,
        dateTo: request.nextUrl.searchParams.get('dateTo') || undefined,
        limit: request.nextUrl.searchParams.get('limit') || undefined,
        includeCommercialReferences:
          request.nextUrl.searchParams.get('includeCommercialReferences') ||
          undefined,
      });

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const data = await SolicitudService.list({
        organization_id: orgScope.organizationId,
        tipo: query.tipo,
        flujo: query.flujo,
        estado: query.estado,
        estado_operativo: query.estado_operativo,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        limit: query.limit,
      });

      const commercialReferences = query.includeCommercialReferences
        ? await SolicitudService.listCommercialReferences({
            organization_id: orgScope.organizationId,
            limit: 6,
          })
        : [];

      return NextResponse.json({
        success: true,
        data,
        count: data.length,
        commercialReferences,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[solicitudes][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las solicitudes' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
