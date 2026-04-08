import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ensureValidUpdatedAfter,
  isMobileValidationError,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  toMobileSolicitudResumen,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { SOLICITUD_TIPOS } from '@/types/solicitudes';

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
      const tipo = searchParams.get('tipo');
      const estado = searchParams.get('estado');
      const assignedTo = searchParams.get('assigned_to');
      const queryText = (searchParams.get('q') || '').trim().toLowerCase();
      const db = getAdminFirestore();

      let query = db
        .collection('solicitudes')
        .where('organization_id', '==', organizationScope.organizationId)
        .orderBy('updated_at', 'desc')
        .limit(Math.min(limit * 3, 300));

      if (normalizedUpdatedAfter) {
        query = query.where('updated_at', '>=', normalizedUpdatedAfter);
      }

      if (cursor) {
        const cursorDoc = await db.collection('solicitudes').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const all = await Promise.all(
        snapshot.docs.map(async doc => SolicitudService.getById(doc.id))
      );

      const filtered = all
        .filter((solicitud): solicitud is NonNullable<typeof solicitud> => Boolean(solicitud))
        .filter(solicitud => {
          if (tipo && SOLICITUD_TIPOS.includes(tipo as (typeof SOLICITUD_TIPOS)[number])) {
            if (solicitud.tipo !== tipo) return false;
          }
          if (estado && solicitud.estado !== estado) return false;
          if (assignedTo && solicitud.assigned_to !== assignedTo) return false;
          if (!queryText) return true;

          const haystack = [
            solicitud.numero,
            solicitud.nombre,
            solicitud.email,
            solicitud.telefono,
            solicitud.mensaje,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(queryText);
        })
        .slice(0, limit);

      return mobileSuccessResponse(
        filtered.map(toMobileSolicitudResumen),
        {
          organization_id: organizationScope.organizationId,
          item_count: filtered.length,
          limit,
          cursor_applied: cursor,
          updated_after: normalizedUpdatedAfter,
          next_cursor:
            snapshot.docs.length > filtered.length && filtered.length > 0
              ? filtered[filtered.length - 1].id
              : null,
          has_more: snapshot.docs.length > filtered.length,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes] GET error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Los filtros de solicitudes no cumplen el contrato mobile.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la lista de solicitudes.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
