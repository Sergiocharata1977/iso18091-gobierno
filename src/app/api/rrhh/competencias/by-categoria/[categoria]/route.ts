import { withAuth } from '@/lib/api/withAuth';
import { competenceService } from '@/services/rrhh/CompetenceService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const { categoria } = await params;
      const requestedOrgId =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const data = await competenceService.getByCategory(
        organizationId,
        categoria
      );
      return NextResponse.json(data);
    } catch (error) {
      console.error(
        'Error en GET /api/rrhh/competencias/by-categoria/[categoria]:',
        error
      );
      return NextResponse.json(
        { error: 'Error al obtener competencias por categoria' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
