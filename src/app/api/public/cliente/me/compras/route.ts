import {
  PublicApiError,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { OportunidadesService } from '@/services/crm/OportunidadesService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request, 'compras');
    if (!context) {
      return NextResponse.json({
        success: true,
        data: {
          resumen: {
            cantidad: 0,
            total_12m: 0,
            total_historico: 0,
            fecha_ultima_compra: null,
          },
          items: [],
        },
      });
    }
    const oportunidades = await OportunidadesService.listar(
      context.organization_id,
      { crm_organizacion_id: context.crm_cliente.id }
    );

    const compras = oportunidades
      .filter(oportunidad => oportunidad.resultado === 'ganada')
      .map(oportunidad => ({
        id: oportunidad.id,
        nombre: oportunidad.nombre,
        descripcion: oportunidad.descripcion,
        monto_estimado: oportunidad.monto_estimado,
        productos_interes: oportunidad.productos_interes ?? [],
        estado_kanban_nombre: oportunidad.estado_kanban_nombre,
        resultado: oportunidad.resultado ?? null,
        fecha_cierre_real: oportunidad.fecha_cierre_real ?? null,
        created_at: oportunidad.created_at,
        updated_at: oportunidad.updated_at,
      }));

    return NextResponse.json({
      success: true,
      data: {
        resumen: {
          cantidad: compras.length,
          total_12m: context.crm_cliente.total_compras_12m ?? 0,
          total_historico:
            context.crm_cliente.monto_total_compras_historico ?? 0,
          fecha_ultima_compra: context.crm_cliente.fecha_ultima_compra ?? null,
        },
        items: compras,
      },
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/compras]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener compras del cliente' },
      { status: 500 }
    );
  }
}
