import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import type { UserRole } from '@/types/auth';
import type {
  NormativaEstado,
  NormativaMunicipal,
  NormativaTipo,
} from '@/types/gov/normativa';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const COLLECTION = 'normativas';
const READ_WRITE_ROLES: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
];
const NORMATIVA_TIPOS = [
  'ordenanza',
  'decreto',
  'resolucion',
  'disposicion',
] as const;
const NORMATIVA_ESTADOS = [
  'borrador',
  'vigente',
  'derogada',
  'archivada',
] as const;

const querySchema = z.object({
  tipo: z.enum(NORMATIVA_TIPOS).optional(),
  estado: z.enum(NORMATIVA_ESTADOS).optional(),
  anio: z.coerce.number().int().min(1900).max(2100).optional(),
  area: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

const createSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  tipo: z.enum(NORMATIVA_TIPOS),
  numero: z.string().trim().min(1).optional(),
  anio: z.number().int().min(1900).max(2100).optional(),
  titulo: z.string().trim().min(1),
  resumen: z.string().trim().min(1),
  estado: z.enum(NORMATIVA_ESTADOS).default('vigente'),
  fecha_sancion: z.string().datetime().optional(),
  fecha_promulgacion: z.string().datetime().optional(),
  fecha_publicacion: z.string().datetime().optional(),
  area_responsable_id: z.string().trim().min(1).optional(),
  area_responsable_nombre: z.string().trim().min(1).optional(),
  emisor: z.string().trim().min(1).optional(),
  tema_tags: z.array(z.string().trim().min(1)).default([]),
  documento_url: z.string().trim().url().optional(),
  expediente_relacionado_id: z.string().trim().min(1).optional(),
  observaciones: z.string().trim().min(1).optional(),
});

function resolveOrganizationId(
  requestedOrgId: string | undefined,
  auth: { organizationId: string; role: UserRole }
) {
  return auth.role === 'super_admin'
    ? requestedOrgId || auth.organizationId
    : auth.organizationId;
}

function serializeTimestamp(value: unknown): string | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}

function serializeNormativa(
  id: string,
  data: Omit<NormativaMunicipal, 'id'> | Record<string, unknown>
) {
  return {
    id,
    ...data,
    fecha_sancion: serializeTimestamp(data.fecha_sancion),
    fecha_promulgacion: serializeTimestamp(data.fecha_promulgacion),
    fecha_publicacion: serializeTimestamp(data.fecha_publicacion),
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

function getTipoPrefix(tipo: NormativaTipo) {
  switch (tipo) {
    case 'ordenanza':
      return 'ORD';
    case 'decreto':
      return 'DEC';
    case 'resolucion':
      return 'RES';
    case 'disposicion':
      return 'DIS';
    default:
      return 'NOR';
  }
}

async function generateNextNumero(
  organizationId: string,
  tipo: NormativaTipo,
  anio: number
) {
  const prefix = `${getTipoPrefix(tipo)}-${anio}-`;
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('tipo', '==', tipo)
    .get();

  let maxSequence = 0;

  for (const doc of snapshot.docs) {
    const numero = doc.data().numero;
    if (typeof numero !== 'string' || !numero.startsWith(prefix)) continue;

    const sequence = Number.parseInt(numero.slice(prefix.length), 10);
    if (Number.isFinite(sequence)) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
}

function buildSearchableText(normativa: Record<string, unknown>): string {
  return [
    normativa.numero,
    normativa.titulo,
    normativa.resumen,
    normativa.area_responsable_nombre,
    normativa.emisor,
    ...((normativa.tema_tags as string[]) || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
}

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId = resolveOrganizationId(requestedOrgId, auth);

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const query = querySchema.parse({
        tipo: searchParams.get('tipo') || undefined,
        estado: searchParams.get('estado') || undefined,
        anio: searchParams.get('anio') || undefined,
        area: searchParams.get('area') || undefined,
        q: searchParams.get('q') || undefined,
      });

      let firestoreQuery: FirebaseFirestore.Query = adminDb
        .collection(COLLECTION)
        .where('organization_id', '==', organizationId);

      if (query.tipo) {
        firestoreQuery = firestoreQuery.where('tipo', '==', query.tipo);
      }
      if (query.estado) {
        firestoreQuery = firestoreQuery.where('estado', '==', query.estado);
      }
      if (query.anio) {
        firestoreQuery = firestoreQuery.where('anio', '==', query.anio);
      }
      if (query.area) {
        firestoreQuery = firestoreQuery.where(
          'area_responsable_id',
          '==',
          query.area
        );
      }

      const snapshot = await firestoreQuery.orderBy('updated_at', 'desc').get();
      const normalizedSearch = query.q?.toLocaleLowerCase('es');
      const data = snapshot.docs
        .map(doc =>
          serializeNormativa(doc.id, doc.data() as Omit<NormativaMunicipal, 'id'>)
        )
        .filter(item => {
          if (!normalizedSearch) return true;
          return buildSearchableText(item as Record<string, unknown>).includes(normalizedSearch);
        });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron listar las normativas',
        },
        { status: 500 }
      );
    }
  },
  { roles: READ_WRITE_ROLES }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = createSchema.parse(await request.json());
      const organizationId = resolveOrganizationId(body.organization_id, auth);

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const now = Timestamp.now();
      const anio = body.anio || now.toDate().getUTCFullYear();
      const payload = {
        organization_id: organizationId,
        tipo: body.tipo,
        numero:
          body.numero || (await generateNextNumero(organizationId, body.tipo, anio)),
        anio,
        titulo: body.titulo,
        resumen: body.resumen,
        estado: body.estado as NormativaEstado,
        fecha_sancion: body.fecha_sancion
          ? Timestamp.fromDate(new Date(body.fecha_sancion))
          : undefined,
        fecha_promulgacion: body.fecha_promulgacion
          ? Timestamp.fromDate(new Date(body.fecha_promulgacion))
          : undefined,
        fecha_publicacion: body.fecha_publicacion
          ? Timestamp.fromDate(new Date(body.fecha_publicacion))
          : undefined,
        area_responsable_id: body.area_responsable_id,
        area_responsable_nombre: body.area_responsable_nombre,
        emisor: body.emisor,
        tema_tags: body.tema_tags,
        documento_url: body.documento_url,
        expediente_relacionado_id: body.expediente_relacionado_id,
        observaciones: body.observaciones,
        created_at: now,
        updated_at: now,
      };

      const docRef = await adminDb.collection(COLLECTION).add(payload);

      return NextResponse.json(
        { success: true, data: serializeNormativa(docRef.id, payload) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo crear la normativa',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
