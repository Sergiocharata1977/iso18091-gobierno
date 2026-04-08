import {
  mobileErrorResponse,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SolicitudCRMBridgeService } from '@/services/solicitudes/SolicitudCRMBridgeService';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';

export const dynamic = 'force-dynamic';

export const POST = withMobileOperacionesAuth(
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

      if (solicitud.crm_oportunidad_id) {
        return mobileSuccessResponse(
          {
            bridged: true,
            oportunidad_id: solicitud.crm_oportunidad_id,
            cliente_id: solicitud.crm_cliente_id ?? null,
          },
          {
            organization_id: organizationScope.organizationId,
          },
          { includeSync: true }
        );
      }

      const result = await SolicitudCRMBridgeService.integrate(id, {
        actor: {
          uid: auth.uid,
          email: auth.email,
          role: auth.role,
          source: 'mobile_operaciones',
        },
      });

      return mobileSuccessResponse(
        {
          bridged: result.bridged,
          reason: result.reason ?? null,
          oportunidad_id: result.crm_oportunidad_id,
          cliente_id: result.crm_cliente_id,
          contacto_id: result.crm_contacto_id,
        },
        {
          organization_id: organizationScope.organizationId,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes/:id/convertir] POST error:', error);
      await SystemActivityLogService.logSystemAction({
        organization_id: auth.organizationId || '',
        occurred_at: new Date(),
        actor_type: 'integration',
        actor_user_id: auth.uid,
        actor_display_name: auth.email,
        actor_role: auth.role,
        source_module: 'mobile_operaciones',
        source_submodule: 'solicitudes',
        channel: 'integration',
        entity_type: 'solicitud',
        entity_id: null,
        entity_code: null,
        action_type: 'update',
        action_label: 'Error convirtiendo solicitud a CRM',
        description:
          error instanceof Error ? error.message : 'Error desconocido integrando solicitud con CRM.',
        status: 'failure',
        severity: 'medium',
        related_entities: [],
        correlation_id: null,
      });
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo convertir la solicitud a oportunidad CRM.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);

