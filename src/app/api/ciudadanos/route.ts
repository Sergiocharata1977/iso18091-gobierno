import { withAuth } from '@/lib/api/withAuth';
import {
  CiudadanoListQuerySchema,
  CreateCiudadanoBodySchema,
} from '@/lib/validations/gov-ciudadano';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { Ciudadano } from '@/types/gov/ciudadano';
import { getAdminFirestore } from '@/lib/firebase/admin';
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

function buildSearchableText(ciudadano: Partial<Ciudadano>): string {
  return [
    ciudadano.nombre,
    ciudadano.apellido,
    ciudadano.dni,
    ciudadano.email,
    ciudadano.telefono,
    ciudadano.direccion,
    ciudadano.barrio,
    ...(ciudadano.etiquetas || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const query = CiudadanoListQuerySchema.parse({
        organization_id:
          request.nextUrl.searchParams.get('organization_id') || undefined,
        barrio: request.nextUrl.searchParams.get('barrio') || undefined,
        tipo: request.nextUrl.searchParams.get('tipo') || undefined,
        search: request.nextUrl.searchParams.get('search') || undefined,
      });

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        query.organization_id
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const db = getAdminFirestore();
      let firestoreQuery: FirebaseFirestore.Query = db
        .collection('citizens')
        .where('organization_id', '==', orgScope.organizationId);

      if (query.barrio) {
        firestoreQuery = firestoreQuery.where('barrio', '==', query.barrio);
      }

      if (query.tipo) {
        firestoreQuery = firestoreQuery.where('tipo', '==', query.tipo);
      }

      const snapshot = await firestoreQuery.get();
      const normalizedSearch = query.search?.toLowerCase();

      const ciudadanos = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as Omit<Ciudadano, 'id'>) }))
        .filter(ciudadano => {
          if (!normalizedSearch) return true;
          return buildSearchableText(ciudadano).includes(normalizedSearch);
        })
        .sort((a, b) => {
          const apellidoCompare = a.apellido.localeCompare(b.apellido, 'es', {
            sensitivity: 'base',
          });
          if (apellidoCompare !== 0) return apellidoCompare;
          return a.nombre.localeCompare(b.nombre, 'es', {
            sensitivity: 'base',
          });
        });

      return NextResponse.json(ciudadanos);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[ciudadanos][GET] Error:', error);
      return NextResponse.json(
        { error: 'No se pudieron obtener los ciudadanos' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_WRITE_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = CreateCiudadanoBodySchema.parse(await request.json());
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organization_id
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const now = Timestamp.now();
      const ciudadanoRef = getAdminFirestore().collection('citizens').doc();
      const ciudadano: Omit<Ciudadano, 'id'> = {
        organization_id: orgScope.organizationId,
        dni: body.dni,
        nombre: body.nombre,
        apellido: body.apellido,
        email: body.email,
        telefono: body.telefono,
        direccion: body.direccion,
        barrio: body.barrio,
        tipo: body.tipo,
        canal_preferido: body.canal_preferido,
        etiquetas: body.etiquetas,
        activo: body.activo,
        created_at: now,
        updated_at: now,
      };

      await ciudadanoRef.set(ciudadano);

      return NextResponse.json(
        { id: ciudadanoRef.id, ...ciudadano },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[ciudadanos][POST] Error:', error);
      return NextResponse.json(
        { error: 'No se pudo crear el ciudadano' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_WRITE_ROLES] }
);
