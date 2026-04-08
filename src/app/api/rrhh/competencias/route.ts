import { withAuth } from '@/lib/api/withAuth';
import { competenceService } from '@/services/rrhh/CompetenceService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const categoria = searchParams.get('categoria');
      const search = searchParams.get('search');
      const requestedOrgId = searchParams.get('organization_id') || undefined;
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

      const competences = await competenceService.getAll(
        organizationId,
        categoria,
        search
      );
      return NextResponse.json(competences);
    } catch (error) {
      console.error('Error en GET /api/rrhh/competencias:', error);
      return NextResponse.json(
        { error: 'Error al obtener competencias' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const requestedOrgId = body.organization_id as string | undefined;
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
      if (
        auth.role !== 'super_admin' &&
        requestedOrgId &&
        requestedOrgId !== organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const competence = await competenceService.create({
        ...body,
        organization_id: organizationId,
      });
      return NextResponse.json(competence, { status: 201 });
    } catch (error) {
      console.error('Error en POST /api/rrhh/competencias:', error);
      return NextResponse.json(
        { error: 'Error al crear competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
