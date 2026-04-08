import { withAuth } from '@/lib/api/withAuth';
import { TrainingService } from '@/services/rrhh/TrainingService';
import { NextResponse } from 'next/server';

async function getAuthorizedTraining(id: string, auth: any) {
  const training = await TrainingService.getById(id);
  if (!training) {
    return {
      error: NextResponse.json(
        { error: 'Capacitacion no encontrada' },
        { status: 404 }
      ),
    };
  }
  if (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    training.organization_id !== auth.organizationId
  ) {
    return {
      error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }
  return { training };
}

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await getAuthorizedTraining(id, auth);
      if (check.error) return check.error;

      const { competenceIds } = await request.json();
      if (!Array.isArray(competenceIds)) {
        return NextResponse.json(
          { error: 'competenceIds debe ser un array' },
          { status: 400 }
        );
      }

      await TrainingService.linkCompetences(id, competenceIds);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(
        'Error en POST /api/rrhh/trainings/[id]/competencias:',
        error
      );
      if (error instanceof Error && error.message.includes('no encontrada')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Error al vincular competencias a la capacitacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await getAuthorizedTraining(id, auth);
      if (check.error) return check.error;

      const competenceIds = check.training?.competenciasDesarrolladas || [];
      if (competenceIds.length === 0) {
        return NextResponse.json([]);
      }

      const { competenceService } = await import(
        '@/services/rrhh/CompetenceService'
      );
      const competences = await Promise.all(
        competenceIds.map(async (competenceId: string) => {
          try {
            return await competenceService.getById(competenceId);
          } catch {
            return null;
          }
        })
      );

      const validCompetences = competences.filter((comp: any) => comp !== null);
      return NextResponse.json(validCompetences);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/trainings/[id]/competencias:',
        error
      );
      return NextResponse.json(
        { error: 'Error al obtener competencias de la capacitacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
