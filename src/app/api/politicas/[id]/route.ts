import { withAuth } from '@/lib/api/withAuth';
import { PoliticaService } from '@/services/politicas/PoliticaService';
import { NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;
const ADMIN_ROLES = ['admin', 'gerente', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string | null
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const politica = await PoliticaService.getById(id);

      if (!politica) {
        return NextResponse.json(
          { error: 'Politica no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (politica as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(politica);
    } catch (error) {
      console.error('Error fetching politica:', error);
      return NextResponse.json(
        { error: 'Error al obtener politica' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PoliticaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Politica no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const data = await request.json();

      if (
        auth.role !== 'super_admin' &&
        data?.organization_id &&
        auth.organizationId &&
        data.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const politica = await PoliticaService.update(id, data, auth.uid);
      return NextResponse.json(politica);
    } catch (error) {
      console.error('Error updating politica:', error);
      return NextResponse.json(
        { error: 'Error al actualizar politica' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await PoliticaService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Politica no encontrada' },
          { status: 404 }
        );
      }

      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await PoliticaService.delete(id, auth.uid);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting politica:', error);
      return NextResponse.json(
        { error: 'Error al eliminar politica' },
        { status: 500 }
      );
    }
  },
  { roles: [...ADMIN_ROLES] }
);
