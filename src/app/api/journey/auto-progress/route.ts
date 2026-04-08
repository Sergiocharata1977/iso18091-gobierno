import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { JourneyAutoProgressService } from '@/services/JourneyAutoProgressService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAuth(
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

    const progress = await JourneyAutoProgressService.computeProgress(
      orgScope.organizationId
    );

    return NextResponse.json({ ok: true, progress });
  },
  { roles: ['admin', 'manager'] }
);
