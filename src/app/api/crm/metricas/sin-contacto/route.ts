import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { getClientesSinContactoReciente } from '@/services/crm/MetricasComercialesService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;
const DEFAULT_DIAS = 15;

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
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

      const diasParam = request.nextUrl.searchParams.get('dias');
      const dias = diasParam ? Number.parseInt(diasParam, 10) : DEFAULT_DIAS;

      if (!Number.isFinite(dias) || dias < 0) {
        return NextResponse.json(
          { success: false, error: 'dias debe ser un entero mayor o igual a 0' },
          { status: 400 }
        );
      }

      const clientes = await getClientesSinContactoReciente(
        orgScope.organizationId,
        dias
      );

      return NextResponse.json({
        success: true,
        data: [...clientes].sort(
          (a, b) => b.dias_sin_contacto - a.dias_sin_contacto
        ),
        count: clientes.length,
      });
    } catch (error) {
      console.error('[crm/metricas/sin-contacto][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener los clientes sin contacto reciente',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);
