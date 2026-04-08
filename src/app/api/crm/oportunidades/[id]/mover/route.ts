import { withAuth } from '@/lib/api/withAuth';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await OportunidadesService.obtener(id);
      if (!current)
        return NextResponse.json(
          { success: false, error: 'Oportunidad no encontrada' },
          { status: 404 }
        );
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = await request.json();
      if (!body.estado_nuevo_id || !body.estado_nuevo_nombre) {
        return NextResponse.json(
          {
            success: false,
            error: 'estado_nuevo_id y estado_nuevo_nombre son requeridos',
          },
          { status: 400 }
        );
      }

      const oportunidad = await OportunidadesService.moverEstado({
        oportunidad_id: id,
        estado_nuevo_id: body.estado_nuevo_id,
        estado_nuevo_nombre: body.estado_nuevo_nombre,
        estado_nuevo_color:
          body.estado_nuevo_color || current.estado_kanban_color || '#6b7280',
        usuario_id: auth.uid,
        usuario_nombre: body.usuario_nombre || auth.email,
        motivo: body.motivo,
      });

      return NextResponse.json({ success: true, data: oportunidad });
    } catch (error: unknown) {
      console.error('Error in POST /api/crm/oportunidades/[id]/mover:', error);
      return NextResponse.json(
        { success: false, error: 'Error al mover oportunidad' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
