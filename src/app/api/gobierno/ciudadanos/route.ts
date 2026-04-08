import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovCiudadanoCreateSchema,
  type GovCiudadano,
} from '@/types/gov-ciudadano';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'citizens';
const READ_ROLES = ['admin', 'manager', 'employee'] as const;
const WRITE_ROLES = ['admin', 'manager'] as const;
const MAX_LIMIT = 50;

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

function serializeCiudadano(
  id: string,
  data: Record<string, unknown>
): GovCiudadano {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    nombre: String(data.nombre || ''),
    apellido: String(data.apellido || ''),
    dni: String(data.dni || ''),
    email: typeof data.email === 'string' ? data.email : undefined,
    telefono: typeof data.telefono === 'string' ? data.telefono : undefined,
    domicilio: typeof data.domicilio === 'string' ? data.domicilio : undefined,
    estado: (data.estado || 'activo') as GovCiudadano['estado'],
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
        serializeCiudadano(doc.id, doc.data() as Record<string, unknown>)
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
      console.error('[gobierno/ciudadanos][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los ciudadanos' },
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

      const body = GovCiudadanoCreateSchema.parse(await request.json());
      const now = Timestamp.now();
      const payload = {
        organization_id: orgScope.organizationId,
        nombre: body.nombre,
        apellido: body.apellido,
        dni: body.dni,
        email: body.email,
        telefono: body.telefono,
        domicilio: body.domicilio,
        estado: 'activo' as const,
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
        { success: true, data: serializeCiudadano(ref.id, payload) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[gobierno/ciudadanos][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
