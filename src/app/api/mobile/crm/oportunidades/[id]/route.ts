import { OportunidadesService } from '@/services/crm/OportunidadesService';
import {
  ensureNotStale,
  isConflictError,
  mobileErrorResponse,
  mobileOportunidadPatchSchema,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  toMobileOportunidadDetalle,
  withMobileCrmAuth,
} from '@/lib/mobile/crm/contracts';

export const dynamic = 'force-dynamic';

export const GET = withMobileCrmAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const oportunidad = await OportunidadesService.obtener(id);

      if (!oportunidad || oportunidad.isActive === false) {
        return mobileErrorResponse(
          404,
          'not_found',
          'Oportunidad no encontrada.'
        );
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        oportunidad.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      return mobileSuccessResponse(toMobileOportunidadDetalle(oportunidad), {
        organization_id: organizationScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/crm/oportunidades/:id] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la oportunidad.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withMobileCrmAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const oportunidad = await OportunidadesService.obtener(id);

      if (!oportunidad || oportunidad.isActive === false) {
        return mobileErrorResponse(
          404,
          'not_found',
          'Oportunidad no encontrada.'
        );
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        oportunidad.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const body = mobileOportunidadPatchSchema.parse(await request.json());
      ensureNotStale(oportunidad.updated_at, body.if_unmodified_since);

      const updated =
        body.offline_action === 'cambiar_etapa_oportunidad'
          ? await OportunidadesService.moverEstado({
              oportunidad_id: id,
              estado_nuevo_id: body.estado_nuevo_id!,
              estado_nuevo_nombre:
                body.estado_nuevo_nombre || oportunidad.estado_kanban_nombre,
              estado_nuevo_color:
                body.estado_nuevo_color || oportunidad.estado_kanban_color,
              usuario_id: auth.uid,
              usuario_nombre: auth.email,
              motivo: body.motivo,
            })
          : await OportunidadesService.actualizar(id, {
              nombre: body.nombre,
              descripcion: body.descripcion,
              contacto_id: body.contacto_id,
              contacto_nombre: body.contacto_nombre,
              vendedor_id: body.vendedor_id,
              vendedor_nombre: body.vendedor_nombre,
              monto_estimado: body.monto_estimado,
              probabilidad: body.probabilidad,
              fecha_cierre_estimada: body.fecha_cierre_estimada,
              productos_interes: body.productos_interes,
              resultado: body.resultado,
              motivo_cierre: body.motivo_cierre,
            });

      return mobileSuccessResponse(
        toMobileOportunidadDetalle(updated),
        {
          organization_id: organizationScope.organizationId,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/crm/oportunidades/:id] PATCH error:', error);
      if (isConflictError(error)) {
        return mobileErrorResponse(
          409,
          'conflict',
          'La oportunidad fue modificada en el servidor. Refresca y reintenta.'
        );
      }
      if (error instanceof Error && error.name === 'ZodError') {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para actualizar oportunidad.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo actualizar la oportunidad.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
