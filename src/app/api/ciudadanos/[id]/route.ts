import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { UpdateCiudadanoBodySchema } from '@/lib/validations/gov-ciudadano';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { Ciudadano } from '@/types/gov/ciudadano';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

const READ_WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

async function getScopedCitizen(
  citizenId: string,
  auth: Parameters<typeof resolveAuthorizedOrganizationId>[0]
) {
  const db = getAdminFirestore();
  const citizenRef = db.collection('citizens').doc(citizenId);
  const citizenDoc = await citizenRef.get();

  if (!citizenDoc.exists) {
    return { status: 404 as const, body: { error: 'Ciudadano no encontrado' } };
  }

  const citizen = {
    id: citizenDoc.id,
    ...(citizenDoc.data() as Omit<Ciudadano, 'id'>),
  };

  const orgScope = await resolveAuthorizedOrganizationId(
    auth,
    citizen.organization_id
  );

  if (!orgScope.ok || !orgScope.organizationId) {
    const error = toOrganizationApiError(orgScope);
    return {
      status: error.status as 400 | 401 | 403 | 404,
      body: { error: error.error, errorCode: error.errorCode },
    };
  }

  if (citizen.organization_id !== orgScope.organizationId) {
    return { status: 403 as const, body: { error: 'Acceso denegado' } };
  }

  return { citizenRef, citizen };
}

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const params = await context.params;
      const citizenId = params['id'];

      if (!citizenId) {
        return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
      }

      const result = await getScopedCitizen(citizenId, auth);
      if ('status' in result) {
        return NextResponse.json(result.body, { status: result.status });
      }

      return NextResponse.json(result.citizen);
    } catch (error) {
      console.error('[ciudadanos/[id]][GET] Error:', error);
      return NextResponse.json(
        { error: 'No se pudo obtener el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_WRITE_ROLES] }
);

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      const params = await context.params;
      const citizenId = params['id'];

      if (!citizenId) {
        return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
      }

      const body = UpdateCiudadanoBodySchema.parse(await request.json());
      const result = await getScopedCitizen(citizenId, auth);
      if ('status' in result) {
        return NextResponse.json(result.body, { status: result.status });
      }

      await result.citizenRef.update({
        ...body,
        updated_at: Timestamp.now(),
      });

      const updatedDoc = await result.citizenRef.get();
      const updatedCitizen = {
        id: updatedDoc.id,
        ...(updatedDoc.data() as Omit<Ciudadano, 'id'>),
      };

      return NextResponse.json(updatedCitizen);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[ciudadanos/[id]][PATCH] Error:', error);
      return NextResponse.json(
        { error: 'No se pudo actualizar el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (_request, context, auth) => {
    try {
      const params = await context.params;
      const citizenId = params['id'];

      if (!citizenId) {
        return NextResponse.json({ error: 'id es requerido' }, { status: 400 });
      }

      const result = await getScopedCitizen(citizenId, auth);
      if ('status' in result) {
        return NextResponse.json(result.body, { status: result.status });
      }

      await result.citizenRef.delete();
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[ciudadanos/[id]][DELETE] Error:', error);
      return NextResponse.json(
        { error: 'No se pudo eliminar el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_WRITE_ROLES] }
);
