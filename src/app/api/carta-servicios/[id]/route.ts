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

const updateSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  codigo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().min(1).optional(),
  area_responsable_id: z.string().trim().min(1).optional(),
  area_responsable_nombre: z.string().trim().min(1).optional(),
  canal_atencion: z.array(z.enum(CHANNELS)).min(1).optional(),
  requisitos: z.array(z.string().trim().min(1)).optional(),
  sla_horas: z.number().int().positive().optional(),
  sla_descripcion: z.string().trim().min(1).optional(),
  costo: z.union([z.number().min(0), z.null()]).optional(),
  moneda: z.union([z.string().trim().min(1), z.null()]).optional(),
  normativa_ids: z.array(z.string().trim().min(1)).optional(),
  activo: z.boolean().optional(),
  publico: z.boolean().optional(),
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

function canReadService(
  auth: OptionalAuthContext,
  service: Omit<ServicioPublico, 'id'>
) {
  if (service.publico && service.activo) {
    return true;
  }

  if (!auth || !auth.user.activo) return false;
  if (!READ_ROLES.includes(auth.role)) return false;
  if (auth.role === 'super_admin') return true;
  return auth.organizationId === service.organization_id;
}

function canWriteService(
  auth: OptionalAuthContext,
  service: Omit<ServicioPublico, 'id'>
) {
  if (!requireWriteAccess(auth)) return false;
  if (auth?.role === 'super_admin') return true;
  return auth?.organizationId === service.organization_id;
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

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const auth = await resolveOptionalAuth(request);
    const { id } = await context.params;
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const data = snapshot.data() as Omit<ServicioPublico, 'id'>;

    if (!canReadService(auth, data)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para acceder al servicio' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeService(snapshot.id, data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo obtener el servicio',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const auth = await resolveOptionalAuth(request);
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const docRef = adminDb.collection(COLLECTION).doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const current = snapshot.data() as Omit<ServicioPublico, 'id'>;

    if (!canWriteService(auth, current)) {
      return NextResponse.json(
        { success: false, error: 'Sin permisos para modificar el servicio' },
        { status: 403 }
      );
    }

    if (
      body.organization_id &&
      auth?.role !== 'super_admin' &&
      body.organization_id !== current.organization_id
    ) {
      return NextResponse.json(
        { success: false, error: 'No se puede reasignar organization_id' },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: Timestamp.now(),
    };

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'undefined' || key === 'organization_id') continue;
      updatePayload[key] = value;
    }

    if (auth?.role === 'super_admin' && body.organization_id) {
      updatePayload.organization_id = body.organization_id;
    }

    await docRef.update(updatePayload);
    const updated = await docRef.get();

    return NextResponse.json({
      success: true,
      data: serializeService(
        updated.id,
        updated.data() as Omit<ServicioPublico, 'id'>
      ),
    });
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
            : 'No se pudo actualizar el servicio',
      },
      { status: 500 }
    );
  }
}
