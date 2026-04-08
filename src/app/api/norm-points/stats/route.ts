import { withAuth } from '@/lib/api/withAuth';
import { NormPointRelationServiceAdmin } from '@/services/normPoints/NormPointRelationServiceAdmin';
import { NormPointServiceAdmin } from '@/services/normPoints/NormPointServiceAdmin';
import {
  ComplianceStatus,
  NormCategory,
  NormPoint,
  NormPointRelation,
} from '@/types/normPoints';
import { NextRequest, NextResponse } from 'next/server';
import {
  ensureOrganization,
  filterRecordsByOrg,
  getRequestedOrgId,
  READ_ROLES,
  validateRequestedOrg,
} from '../_auth';

function buildScopedStats(
  allNormPoints: NormPoint[],
  allRelations: NormPointRelation[],
  upcomingReviews: NormPointRelation[]
) {
  const totalPercentage = allRelations.reduce(
    (sum, rel) => sum + (rel.compliance_percentage || 0),
    0
  );
  const global_percentage =
    allRelations.length > 0 ? totalPercentage / allRelations.length : 0;

  const by_chapter: Record<number, number> = {};
  for (let chapter = 4; chapter <= 10; chapter++) {
    const chapterPoints = allNormPoints.filter(
      point => point.chapter === chapter
    );
    const chapterRelations = allRelations.filter(rel =>
      chapterPoints.some(point => point.id === rel.norm_point_id)
    );
    const chapterTotal = chapterRelations.reduce(
      (sum, rel) => sum + (rel.compliance_percentage || 0),
      0
    );
    by_chapter[chapter] =
      chapterRelations.length > 0 ? chapterTotal / chapterRelations.length : 0;
  }

  const by_category: Record<NormCategory, number> = {
    contexto: 0,
    liderazgo: 0,
    planificacion: 0,
    soporte: 0,
    operacion: 0,
    evaluacion: 0,
    mejora: 0,
  };

  const categories: NormCategory[] = [
    'contexto',
    'liderazgo',
    'planificacion',
    'soporte',
    'operacion',
    'evaluacion',
    'mejora',
  ];

  categories.forEach(category => {
    const categoryPoints = allNormPoints.filter(
      point => point.category === category
    );
    const categoryRelations = allRelations.filter(rel =>
      categoryPoints.some(point => point.id === rel.norm_point_id)
    );
    const categoryTotal = categoryRelations.reduce(
      (sum, rel) => sum + (rel.compliance_percentage || 0),
      0
    );
    by_category[category] =
      categoryRelations.length > 0
        ? categoryTotal / categoryRelations.length
        : 0;
  });

  const by_status: Record<ComplianceStatus, number> = {
    completo: 0,
    parcial: 0,
    pendiente: 0,
    no_aplica: 0,
  };

  allRelations.forEach(rel => {
    if (rel.compliance_status) {
      by_status[rel.compliance_status]++;
    }
  });

  const mandatoryPoints = allNormPoints.filter(point => point.is_mandatory);
  const mandatory_pending = allRelations.filter(
    rel =>
      mandatoryPoints.some(point => point.id === rel.norm_point_id) &&
      rel.compliance_status === 'pendiente'
  ).length;

  const highPriorityPoints = allNormPoints.filter(
    point => point.priority === 'alta'
  );
  const high_priority_pending = allRelations.filter(
    rel =>
      highPriorityPoints.some(point => point.id === rel.norm_point_id) &&
      rel.compliance_status === 'pendiente'
  ).length;

  return {
    global_percentage,
    by_chapter,
    by_category,
    by_status,
    mandatory_pending,
    high_priority_pending,
    upcoming_reviews: upcomingReviews,
  };
}

// GET /api/norm-points/stats - Get compliance statistics
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

      const [allRelationsRaw, allNormPointsRaw, upcomingReviewsRaw] =
        await Promise.all([
          NormPointRelationServiceAdmin.getAll(),
          NormPointServiceAdmin.getAll(),
          NormPointRelationServiceAdmin.getUpcomingReviews(30),
        ]);

      const allRelations = filterRecordsByOrg(
        allRelationsRaw,
        auth.organizationId
      );
      const allNormPoints = filterRecordsByOrg(
        allNormPointsRaw,
        auth.organizationId
      );
      const upcomingReviews = filterRecordsByOrg(
        upcomingReviewsRaw,
        auth.organizationId
      );

      return NextResponse.json(
        buildScopedStats(allNormPoints, allRelations, upcomingReviews)
      );
    } catch (error) {
      console.error('Error getting compliance stats:', error);
      return NextResponse.json(
        { error: 'Error al obtener estadísticas de cumplimiento' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
