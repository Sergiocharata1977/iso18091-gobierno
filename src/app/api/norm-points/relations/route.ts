import { withAuth } from '@/lib/api/withAuth';
import { NormPointRelationService } from '@/services/normPoints/NormPointRelationService';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrganization,
  filterRecordsByOrg,
  getRequestedOrgId,
  READ_ROLES,
  validateRequestedOrg,
} from '../_auth';

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

      const relations = await NormPointRelationService.getAll();
      return NextResponse.json(
        filterRecordsByOrg(relations, auth.organizationId)
      );
    } catch (error) {
      console.error('Error getting norm point relations:', error);
      return NextResponse.json(
        { error: 'Error al obtener relaciones de puntos de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
