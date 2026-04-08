import { withAuth } from '@/lib/api/withAuth';
import { EvaluationService } from '@/services/rrhh/EvaluationService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const { personnelId } = await request.json();

      if (!personnelId) {
        return NextResponse.json(
          { error: 'personnelId es requerido' },
          { status: 400 }
        );
      }

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

      const evaluation =
        await EvaluationService.createFromPositionTemplate(personnelId);

      return NextResponse.json(evaluation, { status: 201 });
    } catch (error) {
      console.error(
        'Error en POST /api/rrhh/evaluaciones/from-template:',
        error
      );

      if (error instanceof Error && error.message.includes('no encontrado')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al crear evaluacion desde plantilla' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
