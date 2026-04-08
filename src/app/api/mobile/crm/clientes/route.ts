import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ensureValidUpdatedAfter,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  shouldIncludeCliente,
  toMobileClienteResumen,
  withMobileCrmAuth,
} from '@/lib/mobile/crm/contracts';
import { NextResponse } from 'next/server';

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
      const q = searchParams.get('q');
      const responsableId = searchParams.get('responsable_id');
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
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(cliente =>
          shouldIncludeCliente(
            cliente as any,
            q,
            responsableId
          )
        )
        .slice(0, limit);

      return mobileSuccessResponse(
        filtered.map(cliente => toMobileClienteResumen(cliente as any)),
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
      console.error('[mobile/crm/clientes] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la lista de clientes.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
