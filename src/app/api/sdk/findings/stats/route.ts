/**
 * Finding Statistics API Route - SDK Unified
 *
 * GET /api/sdk/findings/stats - Get finding statistics
 */

import { FindingService } from '@/lib/sdk/modules/findings';
import type { FindingStatus } from '@/lib/sdk/modules/findings/types';
import { NextRequest, NextResponse } from 'next/server';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

function requireOrganization(auth: AuthContext): NextResponse | null {
  if (!auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Sin organizacion',
        message: 'Usuario sin organizacion asignada',
      },
      { status: 403 }
    );
  }
  return null;
}

function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (!requestedOrgId) return null;
  if (requestedOrgId !== auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Acceso denegado',
        message: 'No puedes operar sobre otra organizacion',
      },
      { status: 403 }
    );
  }
  return null;
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId =
        searchParams.get('organization_id') ||
        searchParams.get('organizationId') ||
        searchParams.get('orgId') ||
        searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const filters = {
        status: (searchParams.get('status') as FindingStatus) || undefined,
        processId: searchParams.get('processId') || undefined,
        sourceId: searchParams.get('sourceId') || undefined,
        year: searchParams.get('year')
          ? parseInt(searchParams.get('year')!)
          : undefined,
      };

      const service = new FindingService();
      const findings = await service.list(filters, { limit: 1000, offset: 0 });
      const scopedFindings = findings.filter(
        finding => (finding as any).organization_id === auth.organizationId
      );

      const stats = {
        total: scopedFindings.length,
        byStatus: {
          registrado: 0,
          accion_planificada: 0,
          accion_ejecutada: 0,
          analisis_completado: 0,
          cerrado: 0,
        } as Record<FindingStatus, number>,
        byProcess: {} as Record<string, number>,
        averageProgress: 0,
        requiresActionCount: 0,
        closedCount: 0,
      };

      let totalProgress = 0;

      scopedFindings.forEach(finding => {
        stats.byStatus[finding.status]++;

        if (finding.registration?.processName) {
          stats.byProcess[finding.registration.processName] =
            (stats.byProcess[finding.registration.processName] || 0) + 1;
        }

        totalProgress += finding.progress;

        if (finding.rootCauseAnalysis?.requiresAction) {
          stats.requiresActionCount++;
        }

        if (finding.status === 'cerrado') {
          stats.closedCount++;
        }
      });

      stats.averageProgress =
        scopedFindings.length > 0
          ? Math.round(totalProgress / scopedFindings.length)
          : 0;

      return NextResponse.json({ stats });
    } catch (error) {
      console.error('Error in GET /api/sdk/findings/stats:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener estad�sticas de hallazgos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
