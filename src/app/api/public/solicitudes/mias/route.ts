import {
  PublicApiError,
  listPortalSolicitudes,
  resolvePublicPortalCustomer,
  serializePortalSolicitudList,
} from '@/lib/public/portalCustomer';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { resolvePublicOrgId } from '@/lib/public/resolveTenantOrg';
import { NextRequest, NextResponse } from 'next/server';

/** Fallback: busca solicitudes por email cuando el usuario no tiene identity CRM vinculada */
async function listSolicitudesByEmail(
  request: NextRequest,
  token: string
): Promise<NextResponse> {
  const decoded = await getAdminAuth().verifyIdToken(token);
  const email = decoded.email;
  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Token sin email', errorCode: 'NO_EMAIL' },
      { status: 400 }
    );
  }

  const organizationId = await resolvePublicOrgId(request, null);
  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: 'Organización no encontrada', errorCode: 'ORG_NOT_FOUND' },
      { status: 404 }
    );
  }

  const db = getAdminFirestore();
  const snap = await db
    .collection('solicitudes')
    .where('organization_id', '==', organizationId)
    .where('email', '==', email)
    .orderBy('created_at', 'desc')
    .limit(50)
    .get();

  const data = snap.docs.map((doc) => {
    const d = doc.data();
    const payload = (d.payload && typeof d.payload === 'object' ? d.payload : {}) as Record<string, unknown>;
    const createdAt =
      d.created_at && typeof d.created_at === 'object' && 'toDate' in d.created_at
        ? (d.created_at as { toDate: () => Date }).toDate().toISOString()
        : new Date().toISOString();

    return {
      id: doc.id,
      numeroSolicitud: String(d.numero || ''),
      tipo: d.tipo,
      estado: d.estado || 'recibida',
      nombre: String(d.nombre || ''),
      email: String(d.email || ''),
      telefono: String(d.telefono || ''),
      created_at: createdAt,
      // Campos tipo-específicos del payload
      maquina_tipo: payload.maquina_tipo ?? null,
      modelo: payload.modelo ?? null,
      descripcion_repuesto: payload.descripcion_repuesto ?? null,
      descripcion_problema: payload.descripcion_problema ?? null,
      localidad: payload.localidad ?? null,
      provincia: payload.provincia ?? null,
      producto_interes: payload.producto_interes ?? null,
      requiere_financiacion: payload.requiere_financiacion ?? null,
      comentarios: payload.comentarios ?? null,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function GET(request: NextRequest) {
  try {
    // Intentar primero el path completo con identity CRM
    try {
      const context = await resolvePublicPortalCustomer(request, 'solicitudes');
      if (!context) {
        const authHeader =
          request.headers.get('authorization') ||
          request.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null;
        if (token) {
          return await listSolicitudesByEmail(request, token);
        }
        return NextResponse.json({ success: true, data: [] });
      }
      const solicitudes = await listPortalSolicitudes(context, { limit: 50 });
      return NextResponse.json({
        success: true,
        data: serializePortalSolicitudList(solicitudes),
      });
    } catch (identityError) {
      // Si falla solo por falta de linkage CRM, hacer fallback por email
      if (
        identityError instanceof PublicApiError &&
        identityError.code === 'PORTAL_LINK_REQUIRED'
      ) {
        const authHeader =
          request.headers.get('authorization') ||
          request.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : null;
        if (token) {
          return await listSolicitudesByEmail(request, token);
        }
      }
      throw identityError;
    }
  } catch (error) {
    if (error instanceof PublicApiError) {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    console.error('[GET /api/public/solicitudes/mias]', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}
