import { withAuth } from '@/lib/api/withAuth';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id, competenciaId } = await params;
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

      await PositionService.removeCompetence(id, competenciaId);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(
        'Error en DELETE /api/rrhh/puestos/[id]/competencias/[competenciaId]:',
        error
      );
      return NextResponse.json(
        { error: 'Error al quitar competencia del puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
