import { withAuth } from '@/lib/api/withAuth';
import { ChecklistTemplateServiceAdmin } from '@/services/checklists/ChecklistTemplateServiceAdmin';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const template = await ChecklistTemplateServiceAdmin.getById(id);
      if (!template)
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (template as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      return NextResponse.json(template);
    } catch (error) {
      console.error('Error getting template:', error);
      return NextResponse.json(
        { error: 'Error al obtener plantilla' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ChecklistTemplateServiceAdmin.getById(id);
      if (!current)
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      await ChecklistTemplateServiceAdmin.update(id, body);
      return NextResponse.json({
        message: 'Plantilla actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Error al actualizar plantilla' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await ChecklistTemplateServiceAdmin.getById(id);
      if (!current)
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const permanent = searchParams.get('permanent') === 'true';
      if (permanent) await ChecklistTemplateServiceAdmin.delete(id);
      else await ChecklistTemplateServiceAdmin.deactivate(id);

      return NextResponse.json({ message: 'Plantilla eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Error al eliminar plantilla' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
