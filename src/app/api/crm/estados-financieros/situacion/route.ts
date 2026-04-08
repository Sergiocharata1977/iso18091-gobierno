import { withAuth } from '@/lib/api/withAuth';
import { EstadosFinancierosService } from '@/services/crm/EstadosFinancierosService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const clienteId = searchParams.get('cliente_id');

      if (!organizationId || !clienteId) {
        return NextResponse.json(
          {
            success: false,
            error: 'organization_id y cliente_id son requeridos',
          },
          { status: 400 }
        );
      }

      const estados =
        await EstadosFinancierosService.getSituacionPatrimonialByCliente(
          organizationId,
          clienteId
        );
      return NextResponse.json({ success: true, data: estados });
    } catch (error: unknown) {
      console.error(
        'Error in GET /api/crm/estados-financieros/situacion:',
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

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organization_id =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;
      if (!organization_id) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const estado = await EstadosFinancierosService.createSituacionPatrimonial(
        organization_id,
        auth.uid,
        {
          crm_organizacion_id: body.crm_organizacion_id,
          cliente_nombre: body.cliente_nombre,
          cliente_cuit: body.cliente_cuit,
          ejercicio: body.ejercicio,
          fecha_cierre: body.fecha_cierre,
          fuente_datos: body.fuente_datos || 'declaracion',
          activo_corriente: body.activo_corriente,
          activo_no_corriente: body.activo_no_corriente,
          pasivo_corriente: body.pasivo_corriente,
          pasivo_no_corriente: body.pasivo_no_corriente,
          patrimonio_neto: body.patrimonio_neto,
          observaciones: body.observaciones,
        }
      );

      return NextResponse.json({ success: true, data: estado });
    } catch (error: unknown) {
      console.error(
        'Error in POST /api/crm/estados-financieros/situacion:',
        error
      );
      return NextResponse.json(
        { success: false, error: 'Error al crear estado' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
