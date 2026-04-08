import { getAdminFirestore } from '@/lib/firebase/admin';
import { DEFAULT_ESTADOS_COMPRAS } from '@/lib/compras/defaultEstados';
import {
  mobileErrorResponse,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';

export const dynamic = 'force-dynamic';

export const GET = withMobileOperacionesAuth(
  async (_request, _context, auth) => {
    try {
      const organizationScope = await resolveMobileOrganizationId(auth, auth.organizationId);
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const db = getAdminFirestore();
      const configSnap = await db
        .collection('organizations')
        .doc(organizationScope.organizationId)
        .collection('kanban_configs')
        .doc('compras')
        .get();

      const estados = configSnap.exists
        ? ((configSnap.data()?.estados as unknown[] | undefined) ?? DEFAULT_ESTADOS_COMPRAS)
        : DEFAULT_ESTADOS_COMPRAS;

      return mobileSuccessResponse(
        { estados },
        { organization_id: organizationScope.organizationId }
      );
    } catch (error) {
      console.error('[mobile/operaciones/compras/estados] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudieron obtener los estados de compras.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
