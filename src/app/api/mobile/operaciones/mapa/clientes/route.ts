import { getAdminFirestore } from '@/lib/firebase/admin';

interface ClienteMapaDoc {
  id: string;
  responsable_id?: unknown;
  razon_social?: unknown;
  nombre_comercial?: unknown;
  localidad?: unknown;
  provincia?: unknown;
  telefono?: unknown;
  [key: string]: unknown;
}

import {
  ensureValidUpdatedAfter,
  isMobileValidationError,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  toMobileMapCliente,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';

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
      const responsableId = searchParams.get('responsable_id');
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const db = getAdminFirestore();

      let query = db
        .collection('crm_organizaciones')
        .where('organization_id', '==', organizationScope.organizationId)
        .where('isActive', '==', true)
        .orderBy('updated_at', 'desc')
        .limit(Math.min(limit * 3, 300));

      if (normalizedUpdatedAfter) {
        query = query.where('updated_at', '>=', normalizedUpdatedAfter);
      }

      if (cursor) {
        const cursorDoc = await db.collection('crm_organizaciones').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ClienteMapaDoc))
        .filter(cliente =>
          responsableId ? cliente.responsable_id === responsableId : true
        )
        .filter(cliente => {
          if (!q) return true;
          const haystack = [
            cliente.razon_social,
            cliente.nombre_comercial,
            cliente.localidad,
            cliente.provincia,
            cliente.telefono,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        })
        .slice(0, limit);

      return mobileSuccessResponse(
        filtered.map(cliente => toMobileMapCliente(cliente as Record<string, unknown>)),
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
      console.error('[mobile/operaciones/mapa/clientes] GET error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Los filtros del mapa de clientes no cumplen el contrato mobile.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener el mapa de clientes.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
