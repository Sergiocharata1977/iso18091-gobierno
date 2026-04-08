import { adminAuth, adminDb } from '@/firebase/admin';
import { resolveOrgIdBySlug } from '@/lib/public/resolveTenantOrg';
import type { UserRole } from '@/types/auth';
import {
  TRANSPARENCIA_CATEGORIAS,
  TRANSPARENCIA_ESTADOS,
  type TransparenciaCategoria,
  type TransparenciaEstado,
  type TransparenciaRegistro,
} from '@/types/gov/transparencia';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const COLLECTION = 'transparencia_publica';
const READ_ROLES: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
];
const WRITE_ROLES: UserRole[] = ['admin', 'gerente', 'jefe', 'super_admin'];

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

const querySchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  tenant: z.string().trim().min(1).max(80).optional(),
  categoria: z.enum(TRANSPARENCIA_CATEGORIAS).optional(),
  estado: z.enum(TRANSPARENCIA_ESTADOS).optional(),
  publico: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  destacado: z
    .enum(['true', 'false'])
    .transform(value => value === 'true')
    .optional(),
  periodo: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});

const createSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  codigo: z.string().trim().min(1).optional(),
  categoria: z.enum(TRANSPARENCIA_CATEGORIAS),
  titulo: z.string().trim().min(3),
  resumen: z.string().trim().min(3),
  periodo: z.string().trim().min(3),
  fecha_publicacion: z.string().trim().min(4),
  area_responsable: z.string().trim().min(2),
  monto: z.number().min(0).optional(),
  unidad: z.string().trim().min(1).optional(),
  valor_actual: z.number().optional(),
  meta: z.number().optional(),
  url_documento: z.string().trim().url().optional().or(z.literal('')),
  etiquetas: z.array(z.string().trim().min(1)).default([]),
  publicado: z.boolean().default(true),
  destacado: z.boolean().default(false),
  estado: z.enum(TRANSPARENCIA_ESTADOS).default('publicado'),
  datos: z.record(z.string(), z.unknown()).default({}),
});

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

function requireReadAccess(auth: OptionalAuthContext) {
  return !!auth && auth.user.activo && READ_ROLES.includes(auth.role);
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

  if (typeof value === 'string') {
    return value;
  }

  return null;
}

function serializeRegistro(
  id: string,
  data: Omit<TransparenciaRegistro, 'id'> | Record<string, unknown>
) {
  return {
    id,
    ...data,
    created_at: serializeTimestamp(data.created_at),
    updated_at: serializeTimestamp(data.updated_at),
  };
}

function normalizeCategoryLabel(categoria: TransparenciaCategoria) {
  switch (categoria) {
    case 'presupuesto':
      return 'PRS';
    case 'compras':
      return 'CMP';
    case 'actos_administrativos':
      return 'ACT';
    case 'indicadores_gestion':
      return 'IND';
    default:
      return 'TRA';
  }
}

async function generateNextCodigo(
  organizationId: string,
  categoria: TransparenciaCategoria
) {
  const prefix = normalizeCategoryLabel(categoria);
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('organization_id', '==', organizationId)
    .where('categoria', '==', categoria)
    .get();

  let maxSequence = 0;
  for (const doc of snapshot.docs) {
    const codigo = doc.data().codigo;
    if (typeof codigo !== 'string') continue;
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(
      codigo.trim().toUpperCase()
    );
    if (!match) continue;
    const sequence = Number.parseInt(match[1], 10);
    if (Number.isFinite(sequence)) {
      maxSequence = Math.max(maxSequence, sequence);
    }
  }

  return `${prefix}-${String(maxSequence + 1).padStart(3, '0')}`;
}

function matchesSearch(item: Record<string, unknown>, term: string) {
  const haystack = [
    item.codigo,
    item.titulo,
    item.resumen,
    item.area_responsable,
    item.periodo,
    ...(Array.isArray(item.etiquetas) ? item.etiquetas : []),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase('es');

  return haystack.includes(term);
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveOptionalAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse({
      organization_id: searchParams.get('organization_id') || undefined,
      tenant: searchParams.get('tenant') || undefined,
      categoria: searchParams.get('categoria') || undefined,
      estado: searchParams.get('estado') || undefined,
      publico: searchParams.get('publico') || undefined,
      destacado: searchParams.get('destacado') || undefined,
      periodo: searchParams.get('periodo') || undefined,
      q: searchParams.get('q') || undefined,
    });

    const tenantOrgId = query.tenant
      ? await resolveOrgIdBySlug(query.tenant)
      : null;
    const requestedOrgId =
      auth?.role === 'super_admin'
        ? query.organization_id || tenantOrgId || auth.organizationId || undefined
        : auth?.organizationId || query.organization_id || tenantOrgId || undefined;

    if (query.tenant && !tenantOrgId) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

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
      !requireReadAccess(auth) ||
      (query.publico === true && auth?.role !== 'super_admin');

    if (publicOnly) {
      firestoreQuery = firestoreQuery
        .where('publicado', '==', true)
        .where('estado', '==', 'publicado');
    } else {
      if (typeof query.publico === 'boolean') {
        firestoreQuery = firestoreQuery.where('publicado', '==', query.publico);
      }
      if (query.estado) {
        firestoreQuery = firestoreQuery.where('estado', '==', query.estado);
      }
    }

    if (typeof query.destacado === 'boolean') {
      firestoreQuery = firestoreQuery.where('destacado', '==', query.destacado);
    }

    const snapshot = await firestoreQuery
      .orderBy('fecha_publicacion', 'desc')
      .get();
    const searchTerm = query.q?.toLocaleLowerCase('es') || '';

    const data = snapshot.docs
      .map(doc =>
        serializeRegistro(doc.id, doc.data() as Omit<TransparenciaRegistro, 'id'>)
      )
      .filter(item => {
        const reg = item as Record<string, unknown>;
        if (query.categoria && reg.categoria !== query.categoria) return false;
        if (query.periodo && reg.periodo !== query.periodo) return false;
        if (!searchTerm) return true;
        return matchesSearch(reg, searchTerm);
      });

    const resumen = TRANSPARENCIA_CATEGORIAS.reduce(
      (acc, categoria) => {
        acc[categoria] = data.filter(item => (item as Record<string, unknown>).categoria === categoria).length;
        return acc;
      },
      {} as Record<TransparenciaCategoria, number>
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        scope: publicOnly ? 'public' : 'internal',
        resumen,
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
            : 'No se pudieron obtener los registros de transparencia',
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
        { success: false, error: 'Sin permisos para cargar datos de transparencia' },
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
    const estado: TransparenciaEstado =
      body.publicado && body.estado === 'borrador' ? 'publicado' : body.estado;
    const payload = {
      organization_id: organizationId,
      codigo:
        body.codigo || (await generateNextCodigo(organizationId, body.categoria)),
      categoria: body.categoria,
      titulo: body.titulo,
      resumen: body.resumen,
      periodo: body.periodo,
      fecha_publicacion: body.fecha_publicacion,
      area_responsable: body.area_responsable,
      monto: body.monto,
      unidad: body.unidad,
      valor_actual: body.valor_actual,
      meta: body.meta,
      url_documento: body.url_documento || undefined,
      etiquetas: body.etiquetas,
      publicado: body.publicado,
      destacado: body.destacado,
      estado,
      datos: body.datos,
      created_by: auth?.uid,
      created_at: now,
      updated_at: now,
    };

    const docRef = await adminDb.collection(COLLECTION).add(payload);

    return NextResponse.json(
      { success: true, data: serializeRegistro(docRef.id, payload) },
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
            : 'No se pudo crear el registro de transparencia',
      },
      { status: 500 }
    );
  }
}
