import {
  PublicApiError,
  buildCuentaCorrientePayload,
  buildPortalClientePayload,
  buildPortalLinkPayload,
  getPortalCustomerOverview,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request, 'profile');
    if (!context) {
      return NextResponse.json({
        success: true,
        data: {
          cliente: null,
          portal: null,
          resumen: {
            solicitudes: 0,
            oportunidades: 0,
            compras_12m: 0,
            monto_compras_12m: 0,
            monto_historico: 0,
            categoria_riesgo: null,
            limite_credito_actual: null,
            evaluacion_vigente_id: null,
          },
          cuenta_corriente: null,
        },
      });
    }
    const overview = await getPortalCustomerOverview(context);
    const evaluacionVigente =
      overview.evaluaciones.find(item => item.es_vigente) ??
      overview.evaluaciones[0] ??
      null;

    return NextResponse.json({
      success: true,
      data: {
        cliente: buildPortalClientePayload(context),
        portal: buildPortalLinkPayload(context),
        resumen: {
          solicitudes: overview.solicitudes.length,
          oportunidades: overview.oportunidades.length,
          compras_12m: context.crm_cliente.cantidad_compras_12m ?? 0,
          monto_compras_12m: context.crm_cliente.total_compras_12m ?? 0,
          monto_historico:
            context.crm_cliente.monto_total_compras_historico ?? 0,
          categoria_riesgo: context.crm_cliente.categoria_riesgo ?? null,
          limite_credito_actual: context.crm_cliente.limite_credito_actual ?? null,
          evaluacion_vigente_id: evaluacionVigente?.id ?? null,
        },
        cuenta_corriente: buildCuentaCorrientePayload({
          cliente: context.crm_cliente,
          evaluacion: evaluacionVigente,
          estadoSituacion: overview.estadosSituacion[0] ?? null,
          estadoResultados: overview.estadosResultados[0] ?? null,
        }),
      },
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la cuenta del cliente' },
      { status: 500 }
    );
  }
}
