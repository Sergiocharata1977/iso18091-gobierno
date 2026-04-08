import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovExpedienteCreateSchema,
  type GovExpediente,
} from '@/types/gov-expediente';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'expedientes';
const READ_ROLES = ['admin', 'manager', 'employee'] as const;
const WRITE_ROLES = ['admin', 'manager'] as const;
const MAX_LIMIT = 50;

type CountAggregateSnapshot = {
  data: () => {
    count?: number;
  };
};

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

async function generateNumeroExpediente(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const snapshot = (await getAdminFirestore()
    .collection('organizations')
    .doc(organizationId)
    .collection(COLLECTION_NAME)
    .count()
    .get()) as CountAggregateSnapshot;
  const seq = String((snapshot.data().count ?? 0) + 1).padStart(5, '0');

  return `EXP-${year}-${seq}`;
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

      const rawLimit = Number(request.nextUrl.searchParams.get('limit') || 20);
      const limit =
        Number.isFinite(rawLimit) && rawLimit > 0
          ? Math.min(Math.trunc(rawLimit), MAX_LIMIT)
          : 20;
      const estado = request.nextUrl.searchParams.get('estado');
      const cursor = request.nextUrl.searchParams.get('cursor');

      const db = getAdminFirestore();
      let query: FirebaseFirestore.Query = db
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .orderBy('updated_at', 'desc');

      if (estado) {
        query = query.where('estado', '==', estado);
      }

      if (cursor) {
        const cursorDoc = await db
          .collection('organizations')
          .doc(orgScope.organizationId)
          .collection(COLLECTION_NAME)
          .doc(cursor)
          .get();

        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.limit(limit).get();
      const data = snapshot.docs.map(doc =>
        serializeExpediente(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          limit,
          cursor_applied: cursor,
          next_cursor:
            snapshot.docs.length === limit
              ? snapshot.docs[snapshot.docs.length - 1]?.id || null
              : null,
        },
      });
    } catch (error) {
      console.error('[gobierno/expedientes][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los expedientes' },
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

      const body = GovExpedienteCreateSchema.parse(await request.json());
      const numero = await generateNumeroExpediente(orgScope.organizationId);
      const now = Timestamp.now();
      const payload = {
        organization_id: orgScope.organizationId,
        numero,
        tipo: body.tipo,
        asunto: body.asunto,
        descripcion: body.descripcion,
        ciudadano_id: body.ciudadano_id,
        estado: 'ingresado' as const,
        prioridad: body.prioridad,
        area_responsable: body.area_responsable,
        created_at: now,
        updated_at: now,
      };

      const ref = await getAdminFirestore()
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .add(payload);

      return NextResponse.json(
        { success: true, data: serializeExpediente(ref.id, payload) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/expedientes][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el expediente' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
