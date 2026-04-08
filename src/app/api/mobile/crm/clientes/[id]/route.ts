import { ClienteCRMServiceAdmin } from '@/services/crm/ClienteCRMServiceAdmin';
import {
  appendOfflineNote,
  ensureNotStale,
  isConflictError,
  mobileClientePatchSchema,
  mobileErrorResponse,
  mobileSuccessResponse,
  resolveMobileOrganizationId,
  toMobileClienteDetalle,
  withMobileCrmAuth,
} from '@/lib/mobile/crm/contracts';

export const dynamic = 'force-dynamic';

export const GET = withMobileCrmAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const cliente = await ClienteCRMServiceAdmin.getById(id);

      if (!cliente || cliente.isActive === false) {
        return mobileErrorResponse(404, 'not_found', 'Cliente no encontrado.');
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        cliente.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      return mobileSuccessResponse(toMobileClienteDetalle(cliente), {
        organization_id: organizationScope.organizationId,
      });
    } catch (error) {
      console.error('[mobile/crm/clientes/:id] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener el detalle del cliente.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PATCH = withMobileCrmAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const cliente = await ClienteCRMServiceAdmin.getById(id);

      if (!cliente || cliente.isActive === false) {
        return mobileErrorResponse(404, 'not_found', 'Cliente no encontrado.');
      }

      const organizationScope = await resolveMobileOrganizationId(
        auth,
        cliente.organization_id
      );
      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const body = mobileClientePatchSchema.parse(await request.json());
      ensureNotStale(cliente.updated_at, body.if_unmodified_since);

      const nextNotes = body.append_note
        ? appendOfflineNote(cliente.notas, body.append_note, auth.uid)
        : body.notas;

      await ClienteCRMServiceAdmin.update(
        id,
        {
          razon_social: body.razon_social,
          nombre_comercial: body.nombre_comercial,
          email: body.email,
          telefono: body.telefono,
          whatsapp_phone: body.whatsapp_phone,
          preferred_channel: body.preferred_channel,
          direccion: body.direccion,
          localidad: body.localidad,
          provincia: body.provincia,
          monto_estimado_compra: body.monto_estimado_compra,
          probabilidad_conversion: body.probabilidad_conversion,
          notas: nextNotes,
        },
        auth.uid
      );

      const updated = await ClienteCRMServiceAdmin.getById(id);
      if (!updated) {
        return mobileErrorResponse(
          404,
          'not_found',
          'Cliente no encontrado luego de actualizar.'
        );
      }

      return mobileSuccessResponse(
        toMobileClienteDetalle(updated),
        {
          organization_id: organizationScope.organizationId,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/crm/clientes/:id] PATCH error:', error);
      if (isConflictError(error)) {
        return mobileErrorResponse(
          409,
          'conflict',
          'El cliente fue modificado en el servidor. Refresca y reintenta.'
        );
      }
      if (error instanceof Error && error.name === 'ZodError') {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para actualizar cliente.',
          undefined,
          JSON.parse(error.message)
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo actualizar el cliente.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
