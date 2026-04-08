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

      const matrix = await NormPointRelationService.getComplianceMatrix();
      const scopedNormPoints = filterRecordsByOrg(
        matrix.norm_points,
        auth.organizationId
      );
      const allowedNormPointIds = scopedNormPoints.map(point => point.id);
      const scopedRelations = new Map(
        Array.from(matrix.relations.entries()).filter(([key]) => {
          return allowedNormPointIds.some(normPointId =>
            key.startsWith(`${normPointId}_`)
          );
        })
      );
      const processIds = new Set(
        Array.from(scopedRelations.keys()).map(key => {
          const normPointId =
            allowedNormPointIds.find(id => key.startsWith(`${id}_`)) || '';
          return normPointId ? key.slice(normPointId.length + 1) : '';
        })
      );

      return NextResponse.json({
        ...matrix,
        norm_points: scopedNormPoints,
        processes: matrix.processes.filter(
          process => processIds.has(process.id) && process.id.length > 0
        ),
        relations: scopedRelations,
      });
    } catch (error) {
      console.error('Error getting compliance matrix:', error);
      return NextResponse.json(
        { error: 'Error al obtener matriz de cumplimiento' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
