import { withAuth } from '@/lib/api/withAuth';
import {
  buildGovMonitorMobileData,
  assembleGovMonitor,
} from '@/lib/gov/monitor-assembler';
import {
  mobileErrorResponse,
  mobileSuccessResponse,
} from '@/lib/mobile/operaciones/contracts';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id') ||
          request.nextUrl.searchParams.get('organizationId')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        return mobileErrorResponse(
          orgScope.status ?? 403,
          orgScope.status === 401 ? 'unauthorized' : 'forbidden',
          orgScope.error || 'No se pudo resolver la organizacion autorizada.',
          {
            organization_id:
              request.nextUrl.searchParams.get('organization_id') || undefined,
          }
        );
      }

      const monitor = await assembleGovMonitor(orgScope.organizationId);

      return mobileSuccessResponse(buildGovMonitorMobileData(monitor), {
        organization_id: orgScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/government/monitor][GET]', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo construir el monitor 18091 mobile.'
      );
    }
  },
  { roles: [...READ_ROLES] }
);
