import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import {
  ensureValidUpdatedAfter,
  mobileCreateAccionSchema,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  shouldIncludeAccion,
  toMobileAccionResumen,
  withMobileCrmAuth,
} from '@/lib/mobile/crm/contracts';
import type { CRMAccion } from '@/types/crmAcciones';

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
      const responsableId =
        searchParams.get('responsable_id') || searchParams.get('vendedor_id');
      const clienteId = searchParams.get('cliente_id');
      const oportunidadId = searchParams.get('oportunidad_id');
      const estado = searchParams.get('estado');
      const fechaDesde = searchParams.get('fecha_desde');

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(organizationScope.organizationId)
        .collection('crm_acciones')
        .orderBy('updatedAt', 'desc')
        .limit(limit + 1);

      if (normalizedUpdatedAfter) {
        query = query.where('updatedAt', '>=', normalizedUpdatedAfter);
      }

      if (cursor) {
        const cursorDoc = await db
          .collection('organizations')
          .doc(organizationScope.organizationId)
          .collection('crm_acciones')
          .doc(cursor)
          .get();

        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const filtered = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as CRMAccion)
        .filter(accion =>
          shouldIncludeAccion(accion, {
            responsableId,
            clienteId,
            oportunidadId,
            estado,
            fechaDesde,
          })
        )
        .slice(0, limit);

      return mobileSuccessResponse(
        filtered.map(toMobileAccionResumen),
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
      console.error('[mobile/crm/acciones] GET error:', error);
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo obtener la lista de acciones.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withMobileCrmAuth(
  async (request, _context, auth) => {
    try {
      const body = mobileCreateAccionSchema.parse(await request.json());
      const organizationScope = await resolveMobileOrganizationId(
        auth,
        auth.organizationId
      );

      if (!organizationScope.ok) {
        return organizationScope.response;
      }

      const now = new Date().toISOString();
      const nuevaAccion = {
        ...body,
        organization_id: organizationScope.organizationId,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.uid,
        estado: body.estado || 'programada',
      };

      const db = getAdminFirestore();
      const docRef = await db
        .collection('organizations')
        .doc(organizationScope.organizationId)
        .collection('crm_acciones')
        .add(nuevaAccion);

      if (body.vendedor_phone) {
        try {
          await AgentQueueService.enqueueJob(
            {
              organization_id: organizationScope.organizationId,
              user_id: body.vendedor_id || auth.uid,
              intent: 'task.assign',
              payload: {
                task_id: docRef.id,
                accion_id: docRef.id,
                task_titulo: body.titulo,
                task_tipo: body.tipo,
                tipo: body.tipo,
                fecha_programada: body.fecha_programada || null,
                responsable_phone: body.vendedor_phone,
                vendedor_phone: body.vendedor_phone,
                responsable_nombre: body.vendedor_nombre || null,
                vendedor_nombre: body.vendedor_nombre || null,
                cliente_nombre: body.cliente_nombre || null,
                cliente_direccion: body.cliente_direccion || null,
              },
              priority: 'high',
            },
            body.vendedor_id || auth.uid
          );
        } catch (queueError) {
          console.error('[mobile/crm/acciones] queue error:', queueError);
        }
      }

      return mobileSuccessResponse(
        toMobileAccionResumen({
          id: docRef.id,
          ...nuevaAccion,
        } as CRMAccion),
        {
          organization_id: organizationScope.organizationId,
        },
        { status: 201, includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/crm/acciones] POST error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Payload invalido para crear accion.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo crear la accion.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
