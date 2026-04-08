import { withAuth } from '@/lib/api/withAuth';
import { competenceService } from '@/services/rrhh/CompetenceService';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { puestoId } = await params;
      const position = await PositionService.getById(puestoId);

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

      const data = await competenceService.getByPuesto(puestoId);
      return NextResponse.json(data);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/competencias/by-puesto/[puestoId]:',
        error
      );
      return NextResponse.json(
        { error: 'Error al obtener competencias por puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
