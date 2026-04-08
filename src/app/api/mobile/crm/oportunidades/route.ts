import { OportunidadesService } from '@/services/crm/OportunidadesService';
import {
  ensureValidUpdatedAfter,
  mobileCreateOportunidadSchema,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  shouldIncludeOportunidad,
  toMobileOportunidadResumen,
  withMobileCrmAuth,
} from '@/lib/mobile/crm/contracts';

export const dynamic = 'force-dynamic';

export const GET = withMobileCrmAuth(
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
      const estadoKanbanId = searchParams.get('estado_kanban_id');
      const responsableId =
        searchParams.get('responsable_id') || searchParams.get('vendedor_id');
      const clienteId =
        searchParams.get('cliente_id') || searchParams.get('crm_organizacion_id');

      const oportunidades = await OportunidadesService.listar(
        organizationScope.organizationId
      );

      const filtered = oportunidades
        .filter(oportunidad =>
          shouldIncludeOportunidad(oportunidad, {
            estadoKanbanId,
            responsableId,
            clienteId,
          })
        )
        .filter(oportunidad =>
          normalizedUpdatedAfter
            ? (oportunidad.updated_at || oportunidad.created_at) >= normalizedUpdatedAfter
            : true
        )
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

      const cursorIndex = cursor
        ? filtered.findIndex(oportunidad => oportunidad.id === cursor)
        : -1;
      const page = filtered.slice(cursorIndex >= 0 ? cursorIndex + 1 : 0, (cursorIndex >= 0 ? cursorIndex + 1 : 0) + limit);
      const nextCursor =
        cursorIndex + 1 + page.length < filtered.length && page.length > 0
          ? page[page.length - 1].id
          : null;

      return mobileSuccessResponse(
        page.map(toMobileOportunidadResumen),
        {
          organization_id: organizationScope.organizationId,
          item_count: page.length,
          limit,
          cursor_applied: cursor,
          updated_after: normalizedUpdatedAfter,
          next_cursor: nextCursor,
          has_more: Boolean(nextCursor),
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/crm/oportunidades] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la lista de oportunidades.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withMobileCrmAuth(
  async (request, _context, auth) => {
    try {
      const body = mobileCreateOportunidadSchema.parse(await request.json());
      const organizationScope = await resolveMobileOrganizationId(
        auth,
        auth.organizationId
      );

      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const created = await OportunidadesService.crear(
        organizationScope.organizationId,
        auth.uid,
        body
      );

      return mobileSuccessResponse(
        toMobileOportunidadResumen(created),
        {
          organization_id: organizationScope.organizationId,
        },
        { status: 201, includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/crm/oportunidades] POST error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para crear oportunidad.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo crear la oportunidad.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
