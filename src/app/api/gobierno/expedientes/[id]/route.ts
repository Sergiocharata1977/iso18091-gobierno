import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovExpedienteUpdateSchema,
  type GovExpediente,
} from '@/types/gov-expediente';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'expedientes';
const READ_ROLES = ['admin', 'manager', 'employee'] as const;
const WRITE_ROLES = ['admin', 'manager'] as const;

function serializeTimestamp(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return new Date(0).toISOString();
}

function serializeExpediente(
  id: string,
  data: Record<string, unknown>
): GovExpediente {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    numero: String(data.numero || ''),
    tipo: (data.tipo || 'otro') as GovExpediente['tipo'],
    asunto: String(data.asunto || ''),
    descripcion: String(data.descripcion || ''),
    ciudadano_id:
      typeof data.ciudadano_id === 'string' ? data.ciudadano_id : undefined,
    estado: (data.estado || 'ingresado') as GovExpediente['estado'],
    prioridad: (data.prioridad || 'media') as GovExpediente['prioridad'],
    area_responsable:
      typeof data.area_responsable === 'string'
        ? data.area_responsable
        : undefined,
    fecha_vencimiento_sla:
      typeof data.fecha_vencimiento_sla === 'string'
        ? data.fecha_vencimiento_sla
        : undefined,
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const snapshot = await getAdminFirestore()
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id)
        .get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Expediente no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeExpediente(
          snapshot.id,
          snapshot.data() as Record<string, unknown>
        ),
      });
    } catch (error) {
      console.error('[gobierno/expedientes/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el expediente' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const body = GovExpedienteUpdateSchema.parse(await request.json());
      const ref = getAdminFirestore()
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id);

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Expediente no encontrado' },
          { status: 404 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: Timestamp.now(),
      };

      for (const [key, value] of Object.entries(body)) {
        if (typeof value !== 'undefined') {
          updatePayload[key] = value;
        }
      }

      await ref.update(updatePayload);
      const updated = await ref.get();

      return NextResponse.json({
        success: true,
        data: serializeExpediente(
          updated.id,
          updated.data() as Record<string, unknown>
        ),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/expedientes/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el expediente' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const ref = getAdminFirestore()
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id);

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Expediente no encontrado' },
          { status: 404 }
        );
      }

      await ref.delete();

      return NextResponse.json({
        success: true,
        data: { id },
      });
    } catch (error) {
      console.error('[gobierno/expedientes/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el expediente' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
