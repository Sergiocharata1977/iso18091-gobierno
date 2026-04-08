import { withAuth } from '@/lib/api/withAuth';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

async function getAuthorizedPosition(id: string, auth: any) {
  const position = await PositionService.getById(id);
  if (!position) {
    return {
      error: NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      ),
    };
  }
  if (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    (position as any).organization_id !== auth.organizationId
  ) {
    return {
      error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    };
  }
  return { position };
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await getAuthorizedPosition(id, auth);
      if (check.error) return check.error;

      const competences = await PositionService.getCompetencesRequired(id);
      return NextResponse.json(competences);
    } catch (error) {
      console.error('Error en GET /api/rrhh/puestos/[id]/competencias:', error);
      return NextResponse.json(
        { error: 'Error al obtener competencias del puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const check = await getAuthorizedPosition(id, auth);
      if (check.error) return check.error;

      const { competenceId, nivelRequerido = 3 } = await request.json();

      if (!competenceId) {
        return NextResponse.json(
          { error: 'competenceId es requerido' },
          { status: 400 }
        );
      }

      await PositionService.addCompetence(id, competenceId, nivelRequerido);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(
        'Error en POST /api/rrhh/puestos/[id]/competencias:',
        error
      );

      if (error instanceof Error && error.message.includes('no encontrada')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Error al asignar competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
