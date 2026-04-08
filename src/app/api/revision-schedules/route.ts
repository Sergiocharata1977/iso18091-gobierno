import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { UserRole } from '@/types/auth';
import {
  type CreateRevisionScheduleDTO,
  RevisionEstadoSchema,
  RevisionScheduleSchema,
  type RevisionEstado,
  type RevisionModulo,
} from '@/types/revisionSchedule';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const allowedRoles: UserRole[] = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
];

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function resolveRevisionEstado(proximaFecha: string, currentEstado?: RevisionEstado): RevisionEstado {
  if (proximaFecha < getTodayIsoDate() && currentEstado === 'pendiente') {
    return 'vencida';
  }

  if (currentEstado) {
    return currentEstado;
  }

  return proximaFecha < getTodayIsoDate() ? 'vencida' : 'pendiente';
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function serializeRevisionSchedule(
  id: string,
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const estado = resolveRevisionEstado(
    String(rawData.proxima_fecha ?? ''),
    rawData.estado as RevisionEstado | undefined
  );

  return {
    id,
    ...rawData,
    estado,
    created_at: serializeTimestamp(rawData.created_at),
    updated_at: serializeTimestamp(rawData.updated_at),
    ultima_completada: serializeTimestamp(rawData.ultima_completada),
  };
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId = scope.organizationId;
      const estadoParam = request.nextUrl.searchParams.get('estado');
      const moduloParam = request.nextUrl.searchParams.get('modulo');

      if (estadoParam) {
        const parsedEstado = RevisionEstadoSchema.safeParse(estadoParam);
        if (!parsedEstado.success) {
          return NextResponse.json(
            { success: false, error: 'Filtro estado inválido' },
            { status: 400 }
          );
        }
      }

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection('revision_schedules')
        .orderBy('created_at', 'desc') as FirebaseFirestore.Query;

      if (moduloParam) {
        query = query.where('modulo', '==', moduloParam as RevisionModulo);
      }

      if (estadoParam && estadoParam !== 'vencida') {
        query = query.where('estado', '==', estadoParam);
      }

      const snap = await query.get();
      let data = snap.docs.map(doc =>
        serializeRevisionSchedule(doc.id, doc.data() as Record<string, unknown>)
      );

      if (estadoParam === 'vencida') {
        data = data.filter(item => item.estado === 'vencida');
      }

      if (moduloParam) {
        data = data.filter(item => item.modulo === moduloParam);
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[revision-schedules][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las revisiones programadas' },
        { status: 500 }
      );
    }
  },
  { roles: allowedRoles }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = RevisionScheduleSchema.parse(
        (await request.json()) as CreateRevisionScheduleDTO
      );
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId = scope.organizationId;
      const estado = resolveRevisionEstado(body.proxima_fecha);
      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('revision_schedules')
        .doc();

      await ref.set({
        ...body,
        organization_id: orgId,
        estado,
        created_by: auth.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, data: { id: ref.id, estado } },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[revision-schedules][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la revisión programada' },
        { status: 500 }
      );
    }
  },
  { roles: allowedRoles }
);
