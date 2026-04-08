import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { JourneyStrategicBadgeService } from '@/services/JourneyStrategicBadgeService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_request, _context, auth) => {
    const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
      requireOrg: true,
    });

    if (!orgScope.ok || !orgScope.organizationId) {
      return NextResponse.json(
        { error: orgScope.error || 'organization_id requerido' },
        { status: orgScope.status || 400 }
      );
    }

    const badges = await JourneyStrategicBadgeService.getBadgesForOrg(
      orgScope.organizationId
    );

    return NextResponse.json({ badges });
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
