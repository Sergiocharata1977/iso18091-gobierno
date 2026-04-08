import {
  PublicApiError,
  resolvePublicPortalCustomer,
} from '@/lib/public/portalCustomer';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await resolvePublicPortalCustomer(request, 'mantenimientos');

    return NextResponse.json({
      success: true,
      data: {
        resumen: {
          cantidad: 0,
          fuente: 'pendiente_integracion',
        },
        items: [],
      },
      message:
        'La ruta queda reservada para mantenimientos vinculados al cliente. Aun no hay una coleccion tenant+cliente conectada a este contrato.',
    });
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/cliente/me/mantenimientos]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener mantenimientos del cliente' },
      { status: 500 }
    );
  }
}
