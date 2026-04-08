import { withAuth } from '@/lib/api/withAuth';
import { TrainingService } from '@/services/rrhh/TrainingService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { competenceId } = await params;
      const trainings = await TrainingService.getByCompetence(competenceId);
      const filtered =
        auth.role === 'super_admin' || !auth.organizationId
          ? trainings
          : trainings.filter(t => t.organization_id === auth.organizationId);

      return NextResponse.json(filtered);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/trainings/by-competence/[competenceId]:',
        error
      );
      return NextResponse.json(
        { error: 'Error al obtener capacitaciones por competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
