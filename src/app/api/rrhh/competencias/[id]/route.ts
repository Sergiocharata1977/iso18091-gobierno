import { withAuth } from '@/lib/api/withAuth';
import { competenceService } from '@/services/rrhh/CompetenceService';
import { NextResponse } from 'next/server';

function denyByOrg(auth: any, resourceOrgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    resourceOrgId &&
    resourceOrgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const competence = await competenceService.getById(id);

      if (!competence) {
        return NextResponse.json(
          { error: 'Competencia no encontrada' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, (competence as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(competence);
    } catch (error) {
      console.error('Error en GET /api/rrhh/competencias/[id]:', error);
      return NextResponse.json(
        { error: 'Error al obtener competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await competenceService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Competencia no encontrada' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      if (
        auth.role !== 'super_admin' &&
        body.organization_id &&
        body.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await competenceService.update(id, {
        ...body,
        organization_id: (current as any).organization_id,
      });

      const updated = await competenceService.getById(id);
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error en PUT /api/rrhh/competencias/[id]:', error);
      return NextResponse.json(
        { error: 'Error al actualizar competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await competenceService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Competencia no encontrada' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const canDelete = await competenceService.validateCanDelete(id);
      if (!canDelete) {
        return NextResponse.json(
          {
            error:
              'No se puede eliminar: la competencia esta asignada a uno o mas puestos',
          },
          { status: 400 }
        );
      }

      await competenceService.delete(id);
      return NextResponse.json({
        message: 'Competencia eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error en DELETE /api/rrhh/competencias/[id]:', error);
      return NextResponse.json(
        { error: 'Error al eliminar competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await competenceService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Competencia no encontrada' },
          { status: 404 }
        );
      }
      if (denyByOrg(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      await competenceService.update(id, {
        ...body,
        organization_id: (current as any).organization_id,
      });

      const updated = await competenceService.getById(id);
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error en PATCH /api/rrhh/competencias/[id]:', error);
      return NextResponse.json(
        { error: 'Error al actualizar competencia' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
