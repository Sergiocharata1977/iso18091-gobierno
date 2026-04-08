import { withAuth } from '@/lib/api/withAuth';
import { EvaluationService } from '@/services/rrhh/EvaluationService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
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
      return NextResponse.json(gaps);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/evaluaciones/gaps/[personnelId]:',
        error
      );

      if (error instanceof Error && error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al calcular brechas de competencias' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
