import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ensureValidUpdatedAfter,
  isMobileValidationError,
  mobileCompraCreateSchema,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  toMobileCompraResumen,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type { Compra } from '@/types/compras';
import { Timestamp } from 'firebase-admin/firestore';

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

function normalizeCompra(
  id: string,
  data: Record<string, unknown>
): Compra & { id: string } {
  return {
    id,
    tipo: (data.tipo as Compra['tipo']) || 'otro',
    estado: String(data.estado || ''),
    prioridad: (data.prioridad as Compra['prioridad']) || 'normal',
    solicitante_id:
      typeof data.solicitante_id === 'string' ? data.solicitante_id : undefined,
    solicitante_nombre: String(data.solicitante_nombre || ''),
    area: String(data.area || ''),
    motivo: String(data.motivo || ''),
    justificacion:
      typeof data.justificacion === 'string' ? data.justificacion : undefined,
    fecha_requerida: data.fecha_requerida,
    fecha_aprobacion: data.fecha_aprobacion,
    fecha_orden: data.fecha_orden,
    fecha_recepcion: data.fecha_recepcion,
    fecha_cierre: data.fecha_cierre,
    proveedor_nombre:
      typeof data.proveedor_nombre === 'string' ? data.proveedor_nombre : undefined,
    proveedor_cuit:
      typeof data.proveedor_cuit === 'string' ? data.proveedor_cuit : undefined,
    proveedor_contacto:
      typeof data.proveedor_contacto === 'string'
        ? data.proveedor_contacto
        : undefined,
    items: Array.isArray(data.items) ? (data.items as Compra['items']) : [],
    monto_estimado:
      typeof data.monto_estimado === 'number'
        ? data.monto_estimado
        : Number(data.monto_estimado || 0),
    monto_real:
      typeof data.monto_real === 'number' ? data.monto_real : undefined,
    moneda: typeof data.moneda === 'string' ? data.moneda : undefined,
    notas: typeof data.notas === 'string' ? data.notas : undefined,
    organization_id: String(data.organization_id || ''),
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: String(data.created_by || ''),
    numero: typeof data.numero === 'number' ? data.numero : undefined,
  };
}

function calculateMontoEstimado(items: Compra['items']): number {
  return items.reduce((total, item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio_unitario_estimado) || 0;
    return total + cantidad * precio;
  }, 0);
}

export const dynamic = 'force-dynamic';

export const GET = withMobileOperacionesAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams, cursor, updatedAfter, limit } = parseListParams(request);
      const organizationScope = await resolveMobileOrganizationId(
        auth,
        searchParams.get('organization_id')
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const normalizedUpdatedAfter = ensureValidUpdatedAfter(updatedAfter);
      const estado = searchParams.get('estado');
      const prioridad = searchParams.get('prioridad');
      const db = getAdminFirestore();

      let query = db
        .collection('compras')
        .where('organization_id', '==', organizationScope.organizationId)
        .orderBy('updated_at', 'desc')
        .limit(Math.min(limit + 20, 120));

      if (normalizedUpdatedAfter) {
        query = query.where('updated_at', '>=', normalizedUpdatedAfter);
      }

      if (cursor) {
        const cursorDoc = await db.collection('compras').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const page = snapshot.docs
        .map(doc => normalizeCompra(doc.id, doc.data() as Record<string, unknown>))
        .filter(compra => (estado ? compra.estado === estado : true))
        .filter(compra => (prioridad ? compra.prioridad === prioridad : true))
        .sort((a, b) => toMillis(b.updated_at) - toMillis(a.updated_at))
        .slice(0, limit);

      return mobileSuccessResponse(
        page.map(toMobileCompraResumen),
        {
          organization_id: organizationScope.organizationId,
          item_count: page.length,
          limit,
          cursor_applied: cursor,
          updated_after: normalizedUpdatedAfter,
          next_cursor:
            snapshot.docs.length > page.length && page.length > 0
              ? page[page.length - 1].id
              : null,
          has_more: snapshot.docs.length > page.length,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/compras] GET error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Los filtros de compras no cumplen el contrato mobile.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la lista de compras.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withMobileOperacionesAuth(
  async (request, _context, auth) => {
    try {
      const body = mobileCompraCreateSchema.parse(await request.json());
      const organizationScope = await resolveMobileOrganizationId(auth, auth.organizationId);
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const db = getAdminFirestore();
      const existing = await db
        .collection('compras')
        .where('organization_id', '==', organizationScope.organizationId)
        .count()
        .get();
      const numero = (existing.data().count || 0) + 1;
      const now = Timestamp.now();
      const docRef = db.collection('compras').doc();
      const payload = {
        ...body,
        numero,
        monto_estimado: calculateMontoEstimado(
          body.items.map(item => ({ ...item, id: item.id ?? '' }))
        ),
        organization_id: organizationScope.organizationId,
        created_by: auth.uid,
        created_at: now,
        updated_at: now,
      };

      await docRef.set(payload);

      await SystemActivityLogService.logUserAction({
        organization_id: organizationScope.organizationId,
        occurred_at: new Date(),
        actor_user_id: auth.uid,
        actor_display_name: auth.email || auth.uid,
        actor_role: auth.role,
        source_module: 'mobile_operaciones',
        source_submodule: 'compras',
        channel: 'api',
        entity_type: 'compra',
        entity_id: docRef.id,
        entity_code: String(numero),
        action_type: 'create',
        action_label: 'Compra creada desde mobile',
        description: `Compra ${numero} creada via mobile operaciones.`,
        status: 'success',
        severity: 'info',
        related_entities: [],
        correlation_id: null,
        metadata: {
          event_name: 'compra_actualizada',
          item_count: body.items.length,
          estado: body.estado,
        },
      });

      return mobileSuccessResponse(
        toMobileCompraResumen(normalizeCompra(docRef.id, payload)),
        {
          organization_id: organizationScope.organizationId,
        },
        { status: 201, includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/compras] POST error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para crear compra.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo crear la compra.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
