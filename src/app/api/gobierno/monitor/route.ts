import { withAuth } from '@/lib/api/withAuth';
import { assembleGovMonitor } from '@/lib/gov/monitor-assembler';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';

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

      const data = await assembleGovMonitor(orgScope.organizationId);

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[gobierno/monitor][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo construir el monitor 18091' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
