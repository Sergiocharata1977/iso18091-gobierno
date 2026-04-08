import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { getMetricasVendedor } from '@/services/crm/MetricasComercialesService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;
const CLIENTES_COLLECTION = 'crm_organizaciones';

function hasValue(value: string): value is string {
  return value.length > 0;
}

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

      const organizationId = orgScope.organizationId;

      const vendedorId =
        request.nextUrl.searchParams.get('vendedor_id')?.trim() || null;

      if (vendedorId) {
        const metricas = await getMetricasVendedor(
          organizationId,
          vendedorId
        );

        return NextResponse.json({
          success: true,
          data: {
            vendedor_id: vendedorId,
            ...metricas,
          },
        });
      }

      const db = getAdminFirestore();
      const vendedoresSnapshot = await db
        .collection(CLIENTES_COLLECTION)
        .where('organization_id', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      const vendedorIds = Array.from(
        new Set(
          vendedoresSnapshot.docs
            .map(doc => {
              const responsableId = doc.data().responsable_id;
              return typeof responsableId === 'string'
                ? responsableId.trim()
                : '';
            })
            .filter(hasValue)
        )
      );

      const metricas = await Promise.all(
        vendedorIds.map(async currentVendedorId => ({
          vendedor_id: currentVendedorId,
          ...(await getMetricasVendedor(
            organizationId,
            currentVendedorId
          )),
        }))
      );

      return NextResponse.json({
        success: true,
        data: metricas,
        count: metricas.length,
      });
    } catch (error) {
      console.error('[crm/metricas/vendedores][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener las metricas por vendedor',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...READ_ROLES] }
);
