/**
 * Trainings API Route - SDK Unified
 *
 * GET /api/sdk/rrhh/trainings - List trainings
 * POST /api/sdk/rrhh/trainings - Create training
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { TrainingService } from '@/lib/sdk/modules/rrhh';
import { CreateTrainingSchema } from '@/lib/sdk/modules/rrhh/validations';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function getRequestedOrgId(searchParams: URLSearchParams): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
}

function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (auth.role === 'super_admin') return null;
  if (!auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Sin organizacion',
        message: 'Usuario sin organizacion asignada',
      },
      { status: 403 }
    );
  }
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

async function getOrgIdFromDoc(
  collection: string,
  id: string
): Promise<string | null> {
  const snap = await getAdminFirestore().collection(collection).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  return (
    (data.organization_id as string | undefined) ||
    (data.organizationId as string | undefined) ||
    null
  );
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const { searchParams } = new URL(request.url);
      const personnelId = searchParams.get('personnelId');
      const competencyId = searchParams.get('competencyId');
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (personnelId && auth.role !== 'super_admin') {
        const personnelOrgId = await getOrgIdFromDoc('personnel', personnelId);
        if (!personnelOrgId || personnelOrgId !== auth.organizationId) {
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }
      }

      if (competencyId && auth.role !== 'super_admin') {
        const competencyOrgId = await getOrgIdFromDoc(
          'competencies',
          competencyId
        );
        if (!competencyOrgId || competencyOrgId !== auth.organizationId) {
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }
      }

      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      const service = new TrainingService();
      let trainings;

      if (personnelId) {
        trainings = await service.getByPersonnel(personnelId);
      } else if (competencyId) {
        trainings = await service.getByCompetence(competencyId);
      } else {
        const filters =
          auth.role === 'super_admin'
            ? requestedOrgId
              ? { organization_id: requestedOrgId }
              : {}
            : { organization_id: auth.organizationId };
        trainings = await service.list(filters, { limit, offset });
      }

      const scopedTrainings =
        auth.role === 'super_admin'
          ? trainings
          : trainings.filter(
              (training: any) =>
                training.organization_id === auth.organizationId
            );

      return NextResponse.json(
        { data: scopedTrainings, count: scopedTrainings.length },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error in GET /api/sdk/rrhh/trainings:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener entrenamientos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
    try {
      const body = await request.json();
      const requestedOrgId =
        body?.organization_id || body?.organizationId || body?.orgId || null;
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validated = CreateTrainingSchema.parse(body);

      if (auth.role !== 'super_admin') {
        const personnelOrgId = await getOrgIdFromDoc(
          'personnel',
          validated.personnelId
        );
        const competencyOrgId = await getOrgIdFromDoc(
          'competencies',
          validated.competencyId
        );
        if (
          !personnelOrgId ||
          !competencyOrgId ||
          personnelOrgId !== auth.organizationId ||
          competencyOrgId !== auth.organizationId
        ) {
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }
      }

      const service = new TrainingService();
      const id = await service.createAndReturnId(validated, auth.uid);

      return NextResponse.json(
        { id, message: 'Entrenamiento creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/rrhh/trainings:', error);
      return NextResponse.json(
        {
          error: 'Error al crear entrenamiento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
