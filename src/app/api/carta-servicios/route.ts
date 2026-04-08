import { adminAuth, adminDb } from '@/firebase/admin';
import type { UserRole } from '@/types/auth';
import type {
  CanalAtencion,
  ServicioPublico,
} from '@/types/gov/service-catalog';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const COLLECTION = 'service_catalog';
const READ_ROLES: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
];
const WRITE_ROLES: UserRole[] = ['admin', 'gerente', 'super_admin'];
const CHANNELS: CanalAtencion[] = [
  'presencial',
  'web',
  'whatsapp',
  'telefono',
  'email',
];

const querySchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  area_responsable_id: z.string().trim().min(1).optional(),
  publico: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  activo: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  q: z.string().trim().min(1).optional(),
  canal: z.enum(CHANNELS).optional(),
});

const createSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  codigo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  area_responsable_id: z.string().trim().min(1),
  area_responsable_nombre: z.string().trim().min(1),
  canal_atencion: z.array(z.enum(CHANNELS)).min(1),
  requisitos: z.array(z.string().trim().min(1)).default([]),
  sla_horas: z.number().int().positive(),
  sla_descripcion: z.string().trim().min(1),
  costo: z.number().min(0).optional(),
  moneda: z.string().trim().min(1).optional(),
  normativa_ids: z.array(z.string().trim().min(1)).optional(),
  activo: z.boolean().default(true),
  publico: z.boolean().default(false),
});

type OptionalAuthContext = {
  uid: string;
  email: string;
  organizationId: string;
  role: UserRole;
  user: {
    id: string;
    email: string;
    rol: UserRole;
    organization_id: string | null;
    personnel_id: string | null;
    activo: boolean;
    status: string;
  };
} | null;

function normalizeUserRole(role?: string | null): UserRole {
  const value = (role || '').trim().toLowerCase();
  switch (value) {
    case 'administrator':
    case 'administrador':
      return 'admin';
    case 'manager':
      return 'gerente';
    case 'supervisor':
      return 'jefe';
    case 'employee':
    case 'empleado':
      return 'operario';
    case 'admin':
    case 'gerente':
    case 'jefe':
    case 'operario':
    case 'auditor':
    case 'super_admin':
      return value;
    default:
      return 'operario';
  }
}

async function resolveOptionalAuth(
  request: NextRequest
): Promise<OptionalAuthContext> {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const sessionCookie = request.cookies.get('session')?.value;
  const authTokenCookie = request.cookies.get('auth-token')?.value;
  const token = bearerToken || authTokenCookie;

  if (!token && !sessionCookie) {
    return null;
  }

  try {
    const decoded = sessionCookie
      ? await adminAuth.verifySessionCookie(sessionCookie, true)
      : await adminAuth.verifyIdToken(token as string);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      const role = normalizeUserRole((decoded.role as string) || null);
      const organizationId = (decoded.organization_id as string) || '';
      return {
        uid: decoded.uid,
        email: decoded.email || '',
        organizationId,
        role,
        user: {
          id: decoded.uid,
          email: decoded.email || '',
          rol: role,
          organization_id: organizationId || null,
          personnel_id: ((decoded.personnel_id as string) || null) as
            | string
            | null,
          activo: true,
          status: 'active',
        },
      };
    }

    const userData = userDoc.data() || {};
    const role = normalizeUserRole(
      (userData.rol as string) || (userData.role as string) || null
    );

    return {
      uid: decoded.uid,
      email: (userData.email as string) || decoded.email || '',
      organizationId: ((userData.organization_id as string) || '') as string,
      role,
      user: {
        id: decoded.uid,
        email: (userData.email as string) || decoded.email || '',
        rol: role,
        organization_id: (userData.organization_id as string) || null,
        personnel_id: (userData.personnel_id as string) || null,
        activo: Boolean(userData.activo ?? false),
        status: (userData.status as string) || 'pending_approval',
      },
    };
  } catch {
    return null;
  }
}

function requireWriteAccess(auth: OptionalAuthContext) {
  return !!auth && auth.user.activo && WRITE_ROLES.includes(auth.role);
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

function serializeService(
  id: string,
  data: Omit<ServicioPublico, 'id'> | Record<string, unknown>
) {
  return {
    id,
    ...data,
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

async function generateNextCodigo(organizationId: string) {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
    .get();

  let maxSequence = 0;

  for (const doc of snapshot.docs) {
    const codigo = doc.data().codigo;
    if (typeof codigo !== 'string') continue;
    const match = /^SRV-(\d+)$/.exec(codigo.trim().toUpperCase());
    if (!match) continue;
    const sequence = Number.parseInt(match[1], 10);
    if (Number.isFinite(sequence)) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  return `SRV-${String(maxSequence + 1).padStart(3, '0')}`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveOptionalAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      organization_id: searchParams.get('organization_id') || undefined,
      area_responsable_id:
        searchParams.get('area_responsable_id') || undefined,
      publico: searchParams.get('publico') || undefined,
      activo: searchParams.get('activo') || undefined,
      q: searchParams.get('q') || undefined,
      canal: searchParams.get('canal') || undefined,
    });

    const requestedOrgId =
      auth?.role === 'super_admin'
        ? query.organization_id || auth.organizationId || undefined
        : auth?.organizationId || query.organization_id || undefined;

    let firestoreQuery = adminDb.collection(
      COLLECTION
    ) as FirebaseFirestore.Query;

    if (requestedOrgId) {
      firestoreQuery = firestoreQuery.where(
        'organization_id',
        '==',
        requestedOrgId
      );
    }

    const publicOnly =
      !auth || (query.publico === true && auth.role !== 'super_admin');

    if (publicOnly) {
      firestoreQuery = firestoreQuery
        .where('publico', '==', true)
        .where('activo', '==', true);
    } else {
      if (typeof query.publico === 'boolean') {
        firestoreQuery = firestoreQuery.where('publico', '==', query.publico);
      }
      if (typeof query.activo === 'boolean') {
        firestoreQuery = firestoreQuery.where('activo', '==', query.activo);
      }
    }

    if (query.area_responsable_id) {
      firestoreQuery = firestoreQuery.where(
        'area_responsable_id',
        '==',
        query.area_responsable_id
      );
    }

    if (query.canal) {
      firestoreQuery = firestoreQuery.where(
        'canal_atencion',
        'array-contains',
        query.canal
      );
    }

    const snapshot = await firestoreQuery.orderBy('nombre', 'asc').get();
    const searchTerm = query.q?.toLocaleLowerCase('es') || '';
    const data = snapshot.docs
      .map(doc =>
        serializeService(doc.id, doc.data() as Omit<ServicioPublico, 'id'>)
      )
      .filter(item => {
        if (!searchTerm) return true;
        const svc = item as Record<string, unknown>;
        return [svc.codigo, svc.nombre, svc.descripcion, svc.area_responsable_nombre]
          .filter((value): value is string => typeof value === 'string')
          .some(value => value.toLocaleLowerCase('es').includes(searchTerm));
      });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        scope: publicOnly ? 'public' : 'internal',
      },
    });
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
            : 'No se pudieron listar los servicios',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveOptionalAuth(request);

    if (!requireWriteAccess(auth)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para crear servicios' },
        { status: 403 }
      );
    }

    const body = createSchema.parse(await request.json());
    const organizationId =
      auth?.role === 'super_admin'
        ? body.organization_id || auth.organizationId
        : auth?.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const payload = {
      organization_id: organizationId,
      codigo: body.codigo || (await generateNextCodigo(organizationId)),
      nombre: body.nombre,
      descripcion: body.descripcion,
      area_responsable_id: body.area_responsable_id,
      area_responsable_nombre: body.area_responsable_nombre,
      canal_atencion: body.canal_atencion,
      requisitos: body.requisitos,
      sla_horas: body.sla_horas,
      sla_descripcion: body.sla_descripcion,
      costo: body.costo,
      moneda: body.moneda,
      normativa_ids: body.normativa_ids || [],
      activo: body.activo,
      publico: body.publico,
      created_at: now,
      updated_at: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(payload);

    return NextResponse.json(
      { success: true, data: serializeService(docRef.id, payload) },
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
            : 'No se pudo crear el servicio',
      },
      { status: 500 }
    );
  }
}
