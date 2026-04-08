import { withAuth } from '@/lib/api/withAuth';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const estadoKanbanId = searchParams.get('estado_kanban_id');
      const vendedorId = searchParams.get('vendedor_id');
      const crmOrganizacionId = searchParams.get('crm_organizacion_id');

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const oportunidades = await OportunidadesService.listar(organizationId, {
        estado_kanban_id: estadoKanbanId || undefined,
        vendedor_id: vendedorId || undefined,
        crm_organizacion_id: crmOrganizacionId || undefined,
      });

      return NextResponse.json({ success: true, data: oportunidades });
    } catch (error: unknown) {
      console.error('Error in GET /api/crm/oportunidades:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return NextResponse.json(
        { success: false, error: 'Error interno', details: errorMessage },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId || !body.nombre || !body.crm_organizacion_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              'organization_id, nombre y crm_organizacion_id son requeridos',
          },
          { status: 400 }
        );
      }

      const oportunidad = await OportunidadesService.crear(
        organizationId,
        auth.uid,
        {
          nombre: body.nombre,
          descripcion: body.descripcion,
          crm_organizacion_id: body.crm_organizacion_id,
          organizacion_nombre: body.organizacion_nombre,
          organizacion_cuit: body.organizacion_cuit,
          contacto_id: body.contacto_id,
          contacto_nombre: body.contacto_nombre,
          vendedor_id: body.vendedor_id,
          vendedor_nombre: body.vendedor_nombre,
          estado_kanban_id: body.estado_kanban_id,
          estado_kanban_nombre: body.estado_kanban_nombre,
          estado_kanban_color: body.estado_kanban_color,
          monto_estimado: body.monto_estimado,
          probabilidad: body.probabilidad,
          fecha_cierre_estimada: body.fecha_cierre_estimada,
          productos_interes: body.productos_interes,
        }
      );

      return NextResponse.json({ success: true, data: oportunidad });
    } catch (error: unknown) {
      console.error('Error in POST /api/crm/oportunidades:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear oportunidad' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
