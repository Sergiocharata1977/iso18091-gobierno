import { withAuth } from '@/lib/api/withAuth';
import { NormPointRelationServiceAdmin } from '@/services/normPoints/NormPointRelationServiceAdmin';
import { NormPointServiceAdmin } from '@/services/normPoints/NormPointServiceAdmin';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrganization,
  filterRecordsByOrg,
  getRequestedOrgId,
  READ_ROLES,
  validateRequestedOrg,
} from '../_auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    const orgGuard = ensureOrganization(auth);
    if (orgGuard) return orgGuard;

    const { searchParams } = new URL(request.url);
    const orgValidation = validateRequestedOrg(
      getRequestedOrgId(searchParams),
      auth
    );
    if (orgValidation) return orgValidation;

    const priority = searchParams.get('priority');
    const normType = searchParams.get('normType');
    const mandatoryOnly = searchParams.get('mandatoryOnly') === 'true';

    let pendingRelationsRaw: Awaited<
      ReturnType<typeof NormPointRelationServiceAdmin.getAll>
    > = [];
    let allNormPointsRaw: Awaited<
      ReturnType<typeof NormPointServiceAdmin.getAll>
    > = [];

    try {
      [pendingRelationsRaw, allNormPointsRaw] = await Promise.all([
        NormPointRelationServiceAdmin.getAll(),
        NormPointServiceAdmin.getAll(),
      ]);
    } catch (error) {
      console.error('[norm-points/gaps] Error loading base data:', error);
      return NextResponse.json([]);
    }

    const pendingRelations = filterRecordsByOrg(
      pendingRelationsRaw.filter(rel => rel.compliance_status === 'pendiente'),
      auth.organizationId
    );
    const allNormPoints = filterRecordsByOrg(
      allNormPointsRaw,
      auth.organizationId
    );

    let filteredPoints = allNormPoints.filter(np =>
      pendingRelations.some(rel => rel.norm_point_id === np.id)
    );

    if (priority && priority !== 'all') {
      filteredPoints = filteredPoints.filter(np => np.priority === priority);
    }

    if (normType && normType !== 'all') {
      filteredPoints = filteredPoints.filter(np => np.tipo_norma === normType);
    }

    if (mandatoryOnly) {
      filteredPoints = filteredPoints.filter(np => np.is_mandatory);
    }

    const priorityOrder: Record<string, number> = {
      alta: 0,
      media: 1,
      baja: 2,
    };

    filteredPoints.sort((a, b) => {
      if (a.is_mandatory && !b.is_mandatory) return -1;
      if (!a.is_mandatory && b.is_mandatory) return 1;

      const aPriority = priorityOrder[a.priority] ?? 99;
      const bPriority = priorityOrder[b.priority] ?? 99;
      return aPriority - bPriority;
    });

    return NextResponse.json(filteredPoints);
  },
  { roles: [...READ_ROLES] }
);
