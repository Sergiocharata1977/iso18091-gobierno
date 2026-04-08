import { adminStorage } from '@/firebase/admin';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ensureValidUpdatedAfter,
  isMobileValidationError,
  mobileErrorResponse,
  mobileSuccessResponse,
  parseListParams,
  resolveMobileOrganizationId,
  withMobileOperacionesAuth,
} from '@/lib/mobile/operaciones/contracts';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import { Timestamp } from 'firebase-admin/firestore';

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
  }
  return null;
}

function toEvidenceResponse(id: string, data: Record<string, unknown>) {
  return {
    id,
    solicitud_id: String(data.solicitud_id || ''),
    organization_id: String(data.organization_id || ''),
    type: String(data.type || 'archivo'),
    label: String(data.label || ''),
    file_name: String(data.file_name || ''),
    mime_type: typeof data.mime_type === 'string' ? data.mime_type : null,
    size_bytes:
      typeof data.size_bytes === 'number' ? data.size_bytes : Number(data.size_bytes || 0),
    url: typeof data.url === 'string' ? data.url : null,
    storage_path: typeof data.storage_path === 'string' ? data.storage_path : null,
    created_by: typeof data.created_by === 'string' ? data.created_by : null,
    offline_source: typeof data.offline_source === 'string' ? data.offline_source : null,
    updated_at: normalizeDate(data.updated_at),
    created_at: normalizeDate(data.created_at),
  };
}

export const dynamic = 'force-dynamic';

export const GET = withMobileOperacionesAuth(
  async (request, { params }, auth) => {
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

      const { cursor, updatedAfter, limit } = parseListParams(request);
      const normalizedUpdatedAfter = ensureValidUpdatedAfter(updatedAfter);
      const db = getAdminFirestore();

      let query = db
        .collection('solicitud_evidencias')
        .where('organization_id', '==', organizationScope.organizationId)
        .where('solicitud_id', '==', solicitud.id)
        .orderBy('updated_at', 'desc')
        .limit(Math.min(limit + 1, 101));

      if (normalizedUpdatedAfter) {
        query = query.where('updated_at', '>=', normalizedUpdatedAfter);
      }

      if (cursor) {
        const cursorDoc = await db.collection('solicitud_evidencias').doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.get();
      const page = snapshot.docs.slice(0, limit).map(doc =>
        toEvidenceResponse(doc.id, doc.data() as Record<string, unknown>)
      );

      return mobileSuccessResponse(
        page,
        {
          organization_id: organizationScope.organizationId,
          item_count: page.length,
          limit,
          cursor_applied: cursor,
          updated_after: normalizedUpdatedAfter,
          next_cursor:
            snapshot.docs.length > limit && page.length > 0
              ? page[page.length - 1].id
              : null,
          has_more: snapshot.docs.length > limit,
        },
        { includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes/:id/evidencias] GET error:', error);
      if (isMobileValidationError(error)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Los filtros de evidencias no cumplen el contrato mobile.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudieron obtener las evidencias.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withMobileOperacionesAuth(
  async (request, { params }, auth) => {
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

      const formData = await request.formData();
      const file = formData.get('file');
      const metadataRaw = formData.get('metadata');

      if (!(file instanceof File)) {
        return mobileErrorResponse(
          400,
          'validation_error',
          'Se requiere un archivo de evidencia.'
        );
      }

      const metadata =
        typeof metadataRaw === 'string' && metadataRaw.trim()
          ? (JSON.parse(metadataRaw) as Record<string, unknown>)
          : {};

      const type =
        typeof metadata.type === 'string' && metadata.type.trim()
          ? metadata.type.trim()
          : file.type.startsWith('image/')
            ? 'foto'
            : file.type.startsWith('audio/')
              ? 'audio'
              : 'archivo';
      const label =
        typeof metadata.label === 'string' && metadata.label.trim()
          ? metadata.label.trim()
          : file.name;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeFileName = `${metadata.client_file_id || Date.now()}-${file.name}`;
      const storagePath = `organizations/${organizationScope.organizationId}/solicitudes/${solicitud.id}/evidencias/${safeFileName}`;
      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type || 'application/octet-stream',
          metadata: {
            organizationId: organizationScope.organizationId,
            solicitudId: solicitud.id,
            uploadedBy: auth.uid,
            type,
            label,
          },
        },
      });

      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const now = Timestamp.now();
      const docRef = getAdminFirestore().collection('solicitud_evidencias').doc();
      const payload = {
        organization_id: organizationScope.organizationId,
        solicitud_id: solicitud.id,
        type,
        label,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        url,
        storage_path: storagePath,
        created_by: auth.uid,
        offline_source:
          typeof metadata.offline_source === 'string' ? metadata.offline_source : null,
        created_at: now,
        updated_at: now,
      };

      await docRef.set(payload);

      await SystemActivityLogService.logUserAction({
        organization_id: organizationScope.organizationId,
        occurred_at: new Date(),
        actor_user_id: auth.uid,
        actor_display_name: auth.email || auth.uid,
        actor_role: auth.role,
        source_module: 'mobile_operaciones',
        source_submodule: 'evidencias',
        channel: 'api',
        entity_type: 'solicitud_evidencia',
        entity_id: docRef.id,
        entity_code: file.name,
        action_type: 'create',
        action_label: 'Evidencia registrada desde mobile',
        description: `Evidencia ${file.name} registrada para la solicitud ${solicitud.numero}.`,
        status: 'success',
        severity: 'info',
        related_entities: [
          { entity_type: 'solicitud', entity_id: solicitud.id, entity_code: solicitud.numero, relation: 'parent' },
        ],
        correlation_id:
          typeof metadata.client_request_id === 'string' ? metadata.client_request_id : null,
        metadata: {
          event_name: 'evidencia_solicitud_registrada',
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          evidence_type: type,
        },
      });

      return mobileSuccessResponse(
        toEvidenceResponse(docRef.id, payload),
        {
          organization_id: organizationScope.organizationId,
        },
        { status: 201, includeSync: true }
      );
    } catch (error) {
      console.error('[mobile/operaciones/solicitudes/:id/evidencias] POST error:', error);
      if (error instanceof Error && error.name === 'SyntaxError') {
        return mobileErrorResponse(
          400,
          'validation_error',
          'metadata debe ser JSON valido.'
        );
      }
      return mobileErrorResponse(
        500,
        'internal_error',
        'No se pudo registrar la evidencia.'
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
