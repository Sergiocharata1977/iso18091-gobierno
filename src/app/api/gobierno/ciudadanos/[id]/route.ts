import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import {
  GovCiudadanoUpdateSchema,
  type GovCiudadano,
} from '@/types/gov-ciudadano';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const COLLECTION_NAME = 'citizens';
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
          { success: false, error: 'Ciudadano no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeCiudadano(
          snapshot.id,
          snapshot.data() as Record<string, unknown>
        ),
      });
    } catch (error) {
      console.error('[gobierno/ciudadanos/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el ciudadano' },
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

      const body = GovCiudadanoUpdateSchema.parse(await request.json());
      const ref = getAdminFirestore()
        .collection('organizations')
        .doc(orgScope.organizationId)
        .collection(COLLECTION_NAME)
        .doc(id);

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        return NextResponse.json(
          { success: false, error: 'Ciudadano no encontrado' },
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
        data: serializeCiudadano(
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

      console.error('[gobierno/ciudadanos/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el ciudadano' },
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
          { success: false, error: 'Ciudadano no encontrado' },
          { status: 404 }
        );
      }

      await ref.update({
        estado: 'inactivo',
        updated_at: Timestamp.now(),
      });

      const updated = await ref.get();
      return NextResponse.json({
        success: true,
        data: serializeCiudadano(
          updated.id,
          updated.data() as Record<string, unknown>
        ),
      });
    } catch (error) {
      console.error('[gobierno/ciudadanos/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo desactivar el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
