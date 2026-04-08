import { withAuth } from '@/lib/api/withAuth';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const position = await PositionService.getById(id);
      if (!position) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (position as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const { meses } = await request.json();
      if (typeof meses !== 'number' || meses < 1 || meses > 60) {
        return NextResponse.json(
          { error: 'Los meses deben estar entre 1 y 60' },
          { status: 400 }
        );
      }

      await PositionService.updateFrecuenciaEvaluacion(id, meses);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(
        'Error en PUT /api/rrhh/puestos/[id]/frecuencia-evaluacion:',
        error
      );
      return NextResponse.json(
        { error: 'Error al actualizar frecuencia de evaluacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
