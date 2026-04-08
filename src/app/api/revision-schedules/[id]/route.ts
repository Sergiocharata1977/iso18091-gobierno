import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { UserRole } from '@/types/auth';
import {
  type RevisionEstado,
  type RevisionFrequencia,
  UpdateRevisionScheduleSchema,
} from '@/types/revisionSchedule';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

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

function addMonthsToIsoDate(dateString: string, months: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, 1));
  baseDate.setUTCMonth(baseDate.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const safeDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), safeDay)
  )
    .toISOString()
    .slice(0, 10);
}

function calculateNextDate(proximaFecha: string, frecuencia: RevisionFrequencia): string {
  const monthsByFrequency: Record<RevisionFrequencia, number> = {
    mensual: 1,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };

  return addMonthsToIsoDate(proximaFecha, monthsByFrequency[frecuencia]);
}

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const orgId = scope.organizationId;
      const db = getAdminFirestore();
      const doc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('revision_schedules')
        .doc(id)
        .get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Revisión programada no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serializeRevisionSchedule(doc.id, doc.data() as Record<string, unknown>),
      });
    } catch (error) {
      console.error('[revision-schedules/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la revisión programada' },
        { status: 500 }
      );
    }
  },
  { roles: allowedRoles }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const body = UpdateRevisionScheduleSchema.parse(await request.json());
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
      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('revision_schedules')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Revisión programada no encontrada' },
          { status: 404 }
        );
      }

      const existingData = existing.data() as Record<string, unknown>;
      const nextProximaFecha = body.proxima_fecha ?? String(existingData.proxima_fecha ?? '');
      const nextEstado = resolveRevisionEstado(
        nextProximaFecha,
        (body.estado ?? existingData.estado) as RevisionEstado | undefined
      );

      const updateData: Record<string, unknown> = {
        ...body,
        estado: nextEstado,
        updated_at: FieldValue.serverTimestamp(),
      };

      const wasCompletedBefore = existingData.estado === 'completada';
      const isMarkingCompleted = body.estado === 'completada' && !wasCompletedBefore;

      if (isMarkingCompleted) {
        const completedAt = new Date().toISOString();
        const frecuencia = String(existingData.frecuencia ?? body.frecuencia) as RevisionFrequencia;
        const currentProximaFecha = String(existingData.proxima_fecha ?? body.proxima_fecha ?? '');
        const nextScheduledDate = calculateNextDate(currentProximaFecha, frecuencia);

        updateData.ultima_completada = completedAt;

        const nextScheduleRef = db
          .collection('organizations')
          .doc(orgId)
          .collection('revision_schedules')
          .doc();

        await Promise.all([
          ref.update(updateData),
          nextScheduleRef.set({
            modulo: body.modulo ?? existingData.modulo,
            titulo: body.titulo ?? existingData.titulo,
            descripcion: body.descripcion ?? existingData.descripcion,
            frecuencia,
            proxima_fecha: nextScheduledDate,
            ultima_completada: completedAt,
            responsable_id: body.responsable_id ?? existingData.responsable_id,
            responsable_nombre: body.responsable_nombre ?? existingData.responsable_nombre,
            estado: 'pendiente',
            notificar_dias_antes:
              body.notificar_dias_antes ?? existingData.notificar_dias_antes ?? 7,
            organization_id: orgId,
            created_by: auth.uid,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          }),
        ]);

        return NextResponse.json({
          success: true,
          data: { id, next_revision_id: nextScheduleRef.id, proxima_fecha: nextScheduledDate },
        });
      }

      await ref.update(updateData);

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[revision-schedules/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la revisión programada' },
        { status: 500 }
      );
    }
  },
  { roles: allowedRoles }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

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
      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('revision_schedules')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Revisión programada no encontrada' },
          { status: 404 }
        );
      }

      await ref.delete();

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error('[revision-schedules/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar la revisión programada' },
        { status: 500 }
      );
    }
  },
  { roles: allowedRoles }
);
