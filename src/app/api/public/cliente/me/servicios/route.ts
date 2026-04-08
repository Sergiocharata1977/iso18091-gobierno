import {
  PublicApiError,
  listPortalSolicitudes,
  resolvePublicPortalCustomer,
  serializePortalSolicitudList,
} from '@/lib/public/portalCustomer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const context = await resolvePublicPortalCustomer(request, 'servicios');
    if (!context) {
      return NextResponse.json({
        success: true,
        data: {
          resumen: {
            cantidad: 0,
          },
          items: [],
        },
      });
    }
    const servicios = await listPortalSolicitudes(context, {
      tipo: 'servicio',
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      data: {
        resumen: {
          cantidad: servicios.length,
        },
        items: serializePortalSolicitudList(servicios),
      },
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/servicios]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener servicios del cliente' },
      { status: 500 }
    );
  }
}
