import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovServicioCreateSchema,
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
  async (request, _context, auth) => {
    try {
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
        .orderBy('updated_at', 'desc')
        .get();

      const data = snapshot.docs.map(doc =>
        serializeServicio(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[gobierno/servicios][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los servicios' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
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

      const body = GovServicioCreateSchema.parse(await request.json());
      const now = Timestamp.now();
      const payload = {
        organization_id: orgScope.organizationId,
        nombre: body.nombre,
        descripcion: body.descripcion,
        area: body.area,
        sla_dias: body.sla_dias,
        requisitos: body.requisitos,
        categoria: body.categoria,
        estado: 'borrador' as const,
        publico: body.publico,
        created_at: now,
        updated_at: now,
      };

      const db = getAdminFirestore();
      const ref = await db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .add(payload);

      return NextResponse.json(
        { success: true, data: serializeServicio(ref.id, payload) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/servicios][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el servicio' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
