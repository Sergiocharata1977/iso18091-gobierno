import { getAdminFirestore } from '@/lib/firebase/admin';
import { DEFAULT_ESTADOS_COMPRAS } from '@/lib/compras/defaultEstados';
import {
  canManagePurchasesByRole,
  ensureNotStale,
  isConflictError,
  isMobileValidationError,
  mobileCompraPatchSchema,
  mobileErrorResponse,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  toMobileCompraDetalle,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import type { Compra } from '@/types/compras';
import { Timestamp } from 'firebase-admin/firestore';

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
    monto_real: typeof data.monto_real === 'number' ? data.monto_real : undefined,
    moneda: typeof data.moneda === 'string' ? data.moneda : undefined,
    notas: typeof data.notas === 'string' ? data.notas : undefined,
    organization_id: String(data.organization_id || ''),
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: String(data.created_by || ''),
    numero: typeof data.numero === 'number' ? data.numero : undefined,
  };
}

export const dynamic = 'force-dynamic';

export const GET = withMobileOperacionesAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const organizationScope = await resolveMobileOrganizationId(auth, auth.organizationId);
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const db = getAdminFirestore();
      const snap = await db.collection('compras').doc(id).get();
      if (!snap.exists) {
        return mobileErrorResponse(404, 'not_found', 'Compra no encontrada.');
      }

      const compra = normalizeCompra(id, snap.data() as Record<string, unknown>);
      if (compra.organization_id !== organizationScope.organizationId) {
        return mobileErrorResponse(404, 'not_found', 'Compra no encontrada.');
      }

      return mobileSuccessResponse(toMobileCompraDetalle(compra), {
        organization_id: organizationScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/operaciones/compras/[id]] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener el detalle de la compra.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withMobileOperacionesAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const body = mobileCompraPatchSchema.parse(await request.json());
      const organizationScope = await resolveMobileOrganizationId(auth, auth.organizationId);
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const db = getAdminFirestore();
      const ref = db.collection('compras').doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        return mobileErrorResponse(404, 'not_found', 'Compra no encontrada.');
      }

      const current = normalizeCompra(id, snap.data() as Record<string, unknown>);
      if (current.organization_id !== organizationScope.organizationId) {
        return mobileErrorResponse(404, 'not_found', 'Compra no encontrada.');
      }

      ensureNotStale(current.updated_at, body.if_unmodified_since);

      const targetEstado = body.estado ?? current.estado;
      const approveTransition = current.estado !== 'aprobada' && targetEstado === 'aprobada';
      const canManagePurchases = canManagePurchasesByRole({
        role: auth.role,
        permissions: auth.permissions,
      });

      if (approveTransition && !canManagePurchases) {
        return mobileErrorResponse(
          403,
          'forbidden',
          'No tenes permisos para aprobar compras.'
        );
      }

      const estadoValido = DEFAULT_ESTADOS_COMPRAS.some(state => state.id === targetEstado);
      if (!estadoValido) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'El estado de compra no existe en la configuracion operativa.'
        );
      }

      const now = Timestamp.now();
      const updatePayload: Record<string, unknown> = {
        updated_at: now,
      };

      if (body.estado !== undefined) updatePayload.estado = body.estado;
      if (body.prioridad !== undefined) updatePayload.prioridad = body.prioridad;
      if (body.proveedor_nombre !== undefined) {
        updatePayload.proveedor_nombre = body.proveedor_nombre;
      }
      if (body.proveedor_cuit !== undefined) updatePayload.proveedor_cuit = body.proveedor_cuit;
      if (body.proveedor_contacto !== undefined) {
        updatePayload.proveedor_contacto = body.proveedor_contacto;
      }
      if (body.fecha_requerida !== undefined) {
        updatePayload.fecha_requerida = body.fecha_requerida;
      }
      if (body.fecha_orden !== undefined) updatePayload.fecha_orden = body.fecha_orden;
      if (body.fecha_recepcion !== undefined) {
        updatePayload.fecha_recepcion = body.fecha_recepcion;
      }
      if (body.fecha_cierre !== undefined) updatePayload.fecha_cierre = body.fecha_cierre;
      if (body.notas !== undefined) updatePayload.notas = body.notas;

      if (approveTransition) {
        updatePayload.fecha_aprobacion = now;
        updatePayload.aprobado_by = auth.uid;
        updatePayload.aprobacion_nota = body.approval_note ?? null;
      }

      await ref.update(updatePayload);
      const updatedSnap = await ref.get();
      const updated = normalizeCompra(
        id,
        updatedSnap.data() as Record<string, unknown>
      );

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
        entity_id: id,
        entity_code: updated.numero ? String(updated.numero) : id,
        action_type: 'update',
        action_label: approveTransition
          ? 'Compra aprobada desde mobile'
          : 'Compra actualizada desde mobile',
        description: approveTransition
          ? `Compra ${updated.numero ?? id} aprobada en mobile operaciones.`
          : `Compra ${updated.numero ?? id} actualizada en mobile operaciones.`,
        status: 'success',
        severity: 'info',
        related_entities: [],
        correlation_id: null,
        metadata: {
          event_name: 'compra_actualizada',
          prev_estado: current.estado,
          new_estado: updated.estado,
        },
      });

      return mobileSuccessResponse(toMobileCompraDetalle(updated), {
        organization_id: organizationScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/operaciones/compras/[id]] PATCH error:', error);
      if (isConflictError(error)) {
        return mobileErrorResponse(
          409,
          'conflict',
          'La compra cambio en el servidor. Refresca y reintenta.'
        );
      }
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para actualizar compra.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo actualizar la compra.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
