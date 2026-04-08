import { withAuth } from '@/lib/api/withAuth';
import { EvaluationService } from '@/services/rrhh/EvaluationService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { TrainingService } from '@/services/rrhh/TrainingService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { personnelId } = await params;
      const personnel = await PersonnelService.getById(personnelId);

      if (!personnel) {
        return NextResponse.json(
          { error: 'Empleado no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnel.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const gaps = await EvaluationService.calculateGaps(personnelId);
      const trainingIds = gaps.flatMap(gap => gap.capacitacionesSugeridas);
      const uniqueTrainingIds = [...new Set(trainingIds)];

      if (uniqueTrainingIds.length === 0) {
        return NextResponse.json([]);
      }

      const trainings = await Promise.all(
        uniqueTrainingIds.map(async trainingId => {
          try {
            return await TrainingService.getById(trainingId);
          } catch {
            return null;
          }
        })
      );

      const validTrainings = trainings.filter(
        training =>
          training &&
          (auth.role === 'super_admin' ||
            !auth.organizationId ||
            training.organization_id === auth.organizationId)
      );

      return NextResponse.json(validTrainings);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/evaluaciones/recommend-trainings/[personnelId]:',
        error
      );

      if (error instanceof Error && error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al obtener recomendaciones de capacitacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
