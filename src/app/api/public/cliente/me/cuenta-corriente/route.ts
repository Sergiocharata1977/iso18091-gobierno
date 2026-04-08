import {
  PublicApiError,
  buildCuentaCorrientePayload,
  getPortalCustomerOverview,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request, 'cuenta_corriente');
    if (!context) {
      return NextResponse.json({
        success: true,
        data: {
          limite_credito_actual: null,
          linea_credito_vigente_id: null,
          categoria_riesgo: null,
          total_compras_12m: 0,
          monto_total_compras_historico: 0,
          evaluacion_vigente: null,
          situacion_patrimonial_vigente: null,
          estado_resultados_vigente: null,
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
      data: buildCuentaCorrientePayload({
        cliente: context.crm_cliente,
        evaluacion: evaluacionVigente,
        estadoSituacion: overview.estadosSituacion[0] ?? null,
        estadoResultados: overview.estadosResultados[0] ?? null,
      }),
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/cuenta-corriente]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener cuenta corriente del cliente' },
      { status: 500 }
    );
  }
}
