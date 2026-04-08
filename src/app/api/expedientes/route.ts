import { adminDb } from '@/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import type {
  Expediente,
  EstadoExpediente,
  HistorialEstado,
} from '@/types/gov/expediente';
import type { UserRole } from '@/types/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const COLLECTION = 'expedientes';
const READ_WRITE_ROLES: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
];
const ESTADOS = [
  'recibido',
  'admitido',
  'en_analisis',
  'derivado',
  'observado',
  'resuelto',
  'archivado',
] as const;

const querySchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  tipo: z.string().trim().min(1).optional(),
  area: z.string().trim().min(1).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
});

const createSchema = z.object({
  organization_id: z.string().min(1).optional(),
  tipo: z.string().trim().min(1),
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  ciudadano_id: z.string().trim().min(1).optional(),
  ciudadano_nombre: z.string().trim().min(1).optional(),
  estado: z.enum(ESTADOS).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  area_responsable_id: z.string().trim().min(1).optional(),
  area_responsable_nombre: z.string().trim().min(1).optional(),
  responsable_id: z.string().trim().min(1).optional(),
  responsable_nombre: z.string().trim().min(1).optional(),
  canal_ingreso: z.enum(['presencial', 'whatsapp', 'web', 'telefono', 'email']),
  sla_horas: z.number().int().positive().optional(),
  fecha_vencimiento: z.string().datetime().optional(),
  adjuntos: z.array(z.string().trim().min(1)).optional(),
  comentario_inicial: z.string().trim().min(1).optional(),
});

function resolveOrganizationId(
  requestedOrgId: string | undefined,
  auth: { organizationId: string; role: UserRole }
) {
  return auth.role === 'super_admin'
    ? requestedOrgId || auth.organizationId
    : auth.organizationId;
}

function getResponsibleName(auth: {
  user: { email: string | null };
  email: string;
}) {
  return auth.user.email || auth.email || 'Usuario';
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

function serializeHistorial(historial: HistorialEstado[] | undefined) {
  return (historial || []).map(entry => ({
    ...entry,
    fecha: serializeTimestamp(entry.fecha),
  }));
}

function serializeExpediente(
  id: string,
  data: Omit<Expediente, 'id'> | Record<string, unknown>
) {
  return {
    id,
    ...data,
    fecha_vencimiento: serializeTimestamp(data.fecha_vencimiento),
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
    historial: serializeHistorial(
      data.historial as HistorialEstado[] | undefined
    ),
  };
}

async function generateNextNumero(organizationId: string, year: number) {
  const prefix = `EXP-${year}-`;
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
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

  return `${prefix}${String(maxSequence + 1).padStart(5, '0')}`;
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
        estado: searchParams.get('estado') || undefined,
        tipo: searchParams.get('tipo') || undefined,
        area: searchParams.get('area') || undefined,
        prioridad: searchParams.get('prioridad') || undefined,
      });

      let firestoreQuery = adminDb
        .collection(COLLECTION)
        .where('organization_id', '==', organizationId);

      if (query.estado) {
        firestoreQuery = firestoreQuery.where('estado', '==', query.estado);
      }
      if (query.tipo) {
        firestoreQuery = firestoreQuery.where('tipo', '==', query.tipo);
      }
      if (query.area) {
        firestoreQuery = firestoreQuery.where(
          'area_responsable_id',
          '==',
          query.area
        );
      }
      if (query.prioridad) {
        firestoreQuery = firestoreQuery.where(
          'prioridad',
          '==',
          query.prioridad
        );
      }

      const snapshot = await firestoreQuery.orderBy('created_at', 'desc').get();
      const data = snapshot.docs.map(doc =>
        serializeExpediente(doc.id, doc.data() as Omit<Expediente, 'id'>)
      );

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
              : 'No se pudieron listar los expedientes',
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
      const numero = await generateNextNumero(
        organizationId,
        now.toDate().getUTCFullYear()
      );
      const responsableNombre =
        body.responsable_nombre || getResponsibleName(auth);
      const historialInicial: HistorialEstado[] = [
        {
          estado: body.estado || 'recibido',
          fecha: now,
          responsable_id: body.responsable_id || auth.uid,
          responsable_nombre: responsableNombre,
          comentario: body.comentario_inicial,
        },
      ];

      const payload = {
        organization_id: organizationId,
        numero,
        tipo: body.tipo,
        titulo: body.titulo,
        descripcion: body.descripcion,
        ciudadano_id: body.ciudadano_id,
        ciudadano_nombre: body.ciudadano_nombre,
        estado: body.estado || 'recibido',
        prioridad: body.prioridad,
        area_responsable_id: body.area_responsable_id,
        area_responsable_nombre: body.area_responsable_nombre,
        responsable_id: body.responsable_id || auth.uid,
        responsable_nombre: responsableNombre,
        canal_ingreso: body.canal_ingreso,
        sla_horas: body.sla_horas,
        fecha_vencimiento: body.fecha_vencimiento
          ? Timestamp.fromDate(new Date(body.fecha_vencimiento))
          : undefined,
        historial: historialInicial,
        adjuntos: body.adjuntos || [],
        created_at: now,
        updated_at: now,
      };

      const docRef = await adminDb.collection(COLLECTION).add(payload);

      return NextResponse.json(
        {
          success: true,
          data: serializeExpediente(docRef.id, payload),
        },
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
              : 'No se pudo crear el expediente',
        },
        { status: 500 }
      );
    }
  },
  { roles: READ_WRITE_ROLES }
);
