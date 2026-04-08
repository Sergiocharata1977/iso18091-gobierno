import { withAuth } from '@/lib/api/withAuth';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function denied(auth: any, orgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    orgId &&
    orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const oportunidad = await OportunidadesService.obtener(id);
      if (!oportunidad)
        return NextResponse.json(
          { success: false, error: 'Oportunidad no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (oportunidad as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: oportunidad });
    } catch (error: unknown) {
      console.error('Error in GET /api/crm/oportunidades/[id]:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await OportunidadesService.obtener(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Oportunidad no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const oportunidad = await OportunidadesService.actualizar(id, body);
      return NextResponse.json({ success: true, data: oportunidad });
    } catch (error: unknown) {
      console.error('Error in PATCH /api/crm/oportunidades/[id]:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await OportunidadesService.obtener(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Oportunidad no encontrada' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await OportunidadesService.eliminar(id);
      return NextResponse.json({
        success: true,
        message: 'Oportunidad eliminada',
      });
    } catch (error: unknown) {
      console.error('Error in DELETE /api/crm/oportunidades/[id]:', error);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
