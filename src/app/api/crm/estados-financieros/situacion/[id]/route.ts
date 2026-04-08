import { withAuth } from '@/lib/api/withAuth';
import { EstadosFinancierosService } from '@/services/crm/EstadosFinancierosService';
import { NextResponse } from 'next/server';

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
      const estado =
        await EstadosFinancierosService.getSituacionPatrimonialById(id);
      if (!estado)
        return NextResponse.json(
          { success: false, error: 'Estado no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (estado as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: estado });
    } catch (error: unknown) {
      console.error(
        'Error in GET /api/crm/estados-financieros/situacion/[id]:',
        error
      );
      return NextResponse.json(
        { success: false, error: 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current =
        await EstadosFinancierosService.getSituacionPatrimonialById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Estado no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      await EstadosFinancierosService.updateSituacionPatrimonial(id, body);
      return NextResponse.json({
        success: true,
        message: 'Estado actualizado',
      });
    } catch (error: unknown) {
      console.error(
        'Error in PATCH /api/crm/estados-financieros/situacion/[id]:',
        error
      );
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
      const current =
        await EstadosFinancierosService.getSituacionPatrimonialById(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Estado no encontrado' },
          { status: 404 }
        );
      if (denied(auth, (current as any).organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await EstadosFinancierosService.deleteSituacionPatrimonial(id);
      return NextResponse.json({ success: true, message: 'Estado eliminado' });
    } catch (error: unknown) {
      console.error(
        'Error in DELETE /api/crm/estados-financieros/situacion/[id]:',
        error
      );
      return NextResponse.json(
        { success: false, error: 'Error al eliminar' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'super_admin'] }
);
