import { withAuth } from '@/lib/api/withAuth';
import { TrainingService } from '@/services/rrhh/TrainingService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const training = await TrainingService.getById(id);

      if (!training) {
        return NextResponse.json(
          { error: 'Capacitacion no encontrada' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        training.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const evaluationId = await TrainingService.createPostEvaluation(id);
      return NextResponse.json({
        success: true,
        evaluationId,
        message: 'Evaluacion posterior creada exitosamente',
      });
    } catch (error) {
      console.error(
        'Error en POST /api/rrhh/trainings/[id]/post-evaluation:',
        error
      );

      if (error instanceof Error) {
        if (error.message.includes('no requiere evaluacion posterior')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (
          error.message.includes('no encontrada') ||
          error.message.includes('no tiene participantes')
        ) {
          return NextResponse.json({ error: error.message }, { status: 404 });
        }
      }

      return NextResponse.json(
        { error: 'Error al crear evaluacion posterior' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
