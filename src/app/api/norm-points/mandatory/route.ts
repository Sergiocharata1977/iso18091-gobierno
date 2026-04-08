import { withAuth } from '@/lib/api/withAuth';
import { NormPointService } from '@/services/normPoints/NormPointService';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrganization,
  filterRecordsByOrg,
  getRequestedOrgId,
  READ_ROLES,
  validateRequestedOrg,
} from '../_auth';

export const dynamic = 'force-dynamic';

// GET /api/norm-points/mandatory - Get mandatory norm points
export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const orgValidation = validateRequestedOrg(
        getRequestedOrgId(request.nextUrl.searchParams),
        auth
      );
      if (orgValidation) return orgValidation;

      const normPoints = await NormPointService.getMandatory();
      return NextResponse.json(
        filterRecordsByOrg(normPoints, auth.organizationId)
      );
    } catch (error) {
      console.error('Error getting mandatory norm points:', error);
      return NextResponse.json(
        { error: 'Error al obtener puntos de norma obligatorios' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
