import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovServicioUpdateSchema,
  type GovServicio,
} from '@/types/gov-servicio';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'service_catalog';
const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

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

function serializeServicio(
  id: string,
  data: Record<string, unknown>
): GovServicio {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    nombre: String(data.nombre || ''),
    descripcion: String(data.descripcion || ''),
    area: String(data.area || ''),
    sla_dias: Number(data.sla_dias || 0),
    requisitos: Array.isArray(data.requisitos)
      ? data.requisitos.map(item => String(item))
      : [],
    categoria: (data.categoria || 'otro') as GovServicio['categoria'],
    estado: (data.estado || 'borrador') as GovServicio['estado'],
    publico: Boolean(data.publico),
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

      const db = getAdminFirestore();
      const snapshot = await db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id)
        .get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Servicio no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeServicio(snapshot.id, snapshot.data() as Record<string, unknown>),
      });
    } catch (error) {
      console.error('[gobierno/servicios/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el servicio' },
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

      const body = GovServicioUpdateSchema.parse(await request.json());
      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id);

      const snapshot = await ref.get();

      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Servicio no encontrado' },
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
        data: serializeServicio(updated.id, updated.data() as Record<string, unknown>),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/servicios/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el servicio' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
