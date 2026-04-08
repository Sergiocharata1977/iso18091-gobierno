import { NextResponse, type NextRequest } from 'next/server';

import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  SOLICITUD_ESTADOS,
  SOLICITUD_TIPOS_OPERATIVOS,
  type Solicitud,
  type SolicitudCRMSyncStatus,
  type SolicitudEstado,
  type SolicitudTipoOperativo,
} from '@/types/solicitudes';
import { getAdminFirestore } from '@/lib/firebase/admin';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeSolicitud(
  id: string,
  data: Record<string, unknown>
): Solicitud {
  return {
    id,
    numero: String(data.numero || ''),
    organization_id: String(data.organization_id || ''),
    tipo: data.tipo as Solicitud['tipo'],
    flujo: data.flujo as Solicitud['flujo'],
    estado: data.estado as SolicitudEstado,
    estado_operativo: data.estado_operativo as Solicitud['estado_operativo'],
    prioridad: (data.prioridad as Solicitud['prioridad']) || null,
    nombre: String(data.nombre || ''),
    telefono: typeof data.telefono === 'string' ? data.telefono : null,
    email: typeof data.email === 'string' ? data.email : null,
    cuit: typeof data.cuit === 'string' ? data.cuit : null,
    mensaje: typeof data.mensaje === 'string' ? data.mensaje : null,
    payload:
      data.payload && typeof data.payload === 'object'
        ? (data.payload as Record<string, unknown>)
        : {},
    origen: String(data.origen || ''),
    assigned_to: typeof data.assigned_to === 'string' ? data.assigned_to : null,
    crm_cliente_id:
      typeof data.crm_cliente_id === 'string' ? data.crm_cliente_id : null,
    crm_contacto_id:
      typeof data.crm_contacto_id === 'string' ? data.crm_contacto_id : null,
    crm_oportunidad_id:
      typeof data.crm_oportunidad_id === 'string'
        ? data.crm_oportunidad_id
        : null,
    crm_sync_status:
      typeof data.crm_sync_status === 'string'
        ? (data.crm_sync_status as SolicitudCRMSyncStatus)
        : null,
    crm_sync_at: data.crm_sync_at ? toDate(data.crm_sync_at) : null,
    crm_sync_error:
      typeof data.crm_sync_error === 'string' ? data.crm_sync_error : null,
    created_at: toDate(data.created_at),
    updated_at: toDate(data.updated_at),
  };
}

function parseTipo(value: string | null): SolicitudTipoOperativo | undefined {
  if (!value) return undefined;
  return SOLICITUD_TIPOS_OPERATIVOS.includes(value as SolicitudTipoOperativo)
    ? (value as SolicitudTipoOperativo)
    : undefined;
}

function parseEstado(value: string | null): SolicitudEstado | undefined {
  if (!value) return undefined;
  return SOLICITUD_ESTADOS.includes(value as SolicitudEstado)
    ? (value as SolicitudEstado)
    : undefined;
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organizationId') ||
          request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope, {
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const tipo = parseTipo(request.nextUrl.searchParams.get('tipo'));
      const estado = parseEstado(request.nextUrl.searchParams.get('estado'));
      const limitParam = Number.parseInt(
        request.nextUrl.searchParams.get('limit') || '50',
        10
      );
      const limit =
        Number.isFinite(limitParam) && limitParam > 0
          ? Math.min(limitParam, 100)
          : 50;

      let query = getAdminFirestore()
        .collection('solicitudes')
        .where('organization_id', '==', orgScope.organizationId);

      if (tipo) {
        query = query.where('tipo', '==', tipo);
      }

      if (estado) {
        query = query.where('estado', '==', estado);
      }

      const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();
      const solicitudes = snapshot.docs.map(doc =>
        normalizeSolicitud(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({
        success: true,
        data: solicitudes,
        total: solicitudes.length,
      });
    } catch (error) {
      console.error('[GET /api/vendedor/solicitudes]', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
