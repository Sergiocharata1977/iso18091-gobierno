import {
  assertSolicitudFinalStateUnlocked,
  ensureNotStale,
  extractOperationalNotes,
  isConflictError,
  isMobileValidationError,
  mobileErrorResponse,
  mobileSolicitudPatchSchema,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  toMobileSolicitudDetalle,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';

export const dynamic = 'force-dynamic';

export const GET = withMobileOperacionesAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const solicitud = await SolicitudService.getById(id);

      if (!solicitud) {
        return mobileErrorResponse(404, 'not_found', 'Solicitud no encontrada.');
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        solicitud.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const history = await SystemActivityLogService.getByEntity(
        organizationScope.organizationId,
        'solicitud',
        solicitud.id
      );

      return mobileSuccessResponse(toMobileSolicitudDetalle(solicitud, { history }), {
        organization_id: organizationScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes/:id] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la solicitud.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withMobileOperacionesAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await SolicitudService.getById(id);

      if (!current) {
        return mobileErrorResponse(404, 'not_found', 'Solicitud no encontrada.');
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        current.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const body = mobileSolicitudPatchSchema.parse(await request.json());
      ensureNotStale(current.updated_at, body.if_unmodified_since);
      assertSolicitudFinalStateUnlocked(current, {
        estado: body.estado,
        estado_operativo: body.estado_operativo,
      });

      const nextPayload =
        body.operational_note && body.operational_note.trim()
          ? {
              ...(current.payload || {}),
              notas_operativas: [
                ...extractOperationalNotes(current.payload),
                {
                  id: `note-${Date.now()}`,
                  texto: body.operational_note.trim(),
                  created_at: new Date().toISOString(),
                  created_by: auth.uid,
                  created_by_name: auth.email || auth.uid,
                  source: 'operaciones_android',
                },
              ],
            }
          : undefined;

      const updated = await SolicitudService.update(id, {
        estado: body.estado,
        estado_operativo: body.estado_operativo,
        prioridad: body.prioridad,
        assigned_to: body.assigned_to,
        payload: nextPayload,
      });

      if (!updated) {
        return mobileErrorResponse(404, 'not_found', 'Solicitud no encontrada.');
      }

      await SystemActivityLogService.logUserAction({
        organization_id: updated.organization_id,
        occurred_at: new Date(),
        actor_user_id: auth.uid,
        actor_display_name: auth.email || auth.uid,
        actor_role: auth.role,
        source_module: 'mobile_operaciones',
        source_submodule: 'solicitudes',
        channel: 'api',
        entity_type: 'solicitud',
        entity_id: updated.id,
        entity_code: updated.numero,
        action_type: 'update',
        action_label: 'Solicitud actualizada desde mobile',
        description:
          body.audit_note ||
          body.operational_note ||
          `Solicitud ${updated.numero} actualizada via mobile operaciones.`,
        status: 'success',
        severity: 'info',
        related_entities: [
          {
            entity_type: 'organization',
            entity_id: updated.organization_id,
            relation: 'scope',
          },
        ],
        correlation_id: body.client_request_id || null,
        metadata: {
          event_name: 'solicitud_actualizada',
          offline_action: body.offline_action || null,
          previous_estado: current.estado,
          previous_estado_operativo: current.estado_operativo,
          new_estado: updated.estado,
          new_estado_operativo: updated.estado_operativo,
          assigned_to: updated.assigned_to ?? null,
          operational_note: body.operational_note || null,
        },
      });

      const history = await SystemActivityLogService.getByEntity(
        organizationScope.organizationId,
        'solicitud',
        updated.id
      );

      return mobileSuccessResponse(
        toMobileSolicitudDetalle(updated, { history }),
        {
          organization_id: organizationScope.organizationId,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes/:id] PATCH error:', error);
      if (isConflictError(error)) {
        return mobileErrorResponse(
          409,
          'conflict',
          'La solicitud fue modificada o ya esta cerrada. Refresca y reintenta.'
        );
      }
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para actualizar solicitud.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo actualizar la solicitud.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
