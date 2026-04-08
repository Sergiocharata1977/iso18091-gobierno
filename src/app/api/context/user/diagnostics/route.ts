import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  toOrganizationApiError,
  verifyTargetUserOrganizationScope,
} from '@/middleware/verifyOrganization';
import { UserContextService } from '@/services/context/UserContextService';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

const QuerySchema = z.object({
  userId: z.string().min(1).optional(),
  refresh: z.enum(['true', 'false']).optional(),
});

const RepairBodySchema = z.object({
  userId: z.string().min(1).optional(),
  dryRun: z.boolean().optional(),
  source: z.enum(['auto', 'granular', 'position']).optional(),
});

function canReadUser(auth: { uid: string; role: string }, userId: string) {
  if (auth.role === 'super_admin') return true;
  if (auth.uid === userId) return true;
  return ['admin', 'gerente', 'jefe', 'auditor'].includes(auth.role);
}

function uniqStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => typeof v === 'string' && !!v))
  );
}

async function authorizeTargetUser(auth: any, targetUserId: string) {
  if (!canReadUser(auth, targetUserId)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  if (auth.role !== 'super_admin' && targetUserId !== auth.uid) {
    const targetScope = await verifyTargetUserOrganizationScope(
      auth,
      targetUserId
    );
    if (!targetScope.ok) {
      const orgError = toOrganizationApiError(targetScope, {
        defaultStatus: 403,
        defaultError: 'Acceso denegado',
      });
      return NextResponse.json(
        { error: orgError.error, errorCode: orgError.errorCode },
        { status: orgError.status }
      );
    }
  }

  return null;
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = QuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const targetUserId = query.userId || auth.uid;
      const refresh = query.refresh !== 'false';

      const authError = await authorizeTargetUser(auth, targetUserId);
      if (authError) return authError;

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(targetUserId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const userData = (userDoc.data() || {}) as Record<string, unknown>;
      const personnelId =
        typeof userData.personnel_id === 'string'
          ? userData.personnel_id
          : null;

      const personnelDoc = personnelId
        ? await db.collection('personnel').doc(personnelId).get()
        : null;
      const personnelData = personnelDoc?.exists
        ? ((personnelDoc.data() || {}) as Record<string, unknown>)
        : null;

      const positionId =
        (typeof personnelData?.puesto_id === 'string' &&
          personnelData.puesto_id) ||
        (typeof personnelData?.puesto === 'string' && personnelData.puesto) ||
        null;
      const departmentId =
        (typeof personnelData?.departamento_id === 'string' &&
          personnelData.departamento_id) ||
        (typeof personnelData?.departamento === 'string' &&
          personnelData.departamento) ||
        null;

      const [positionDoc, granularAssignmentsSnap, jefeProcesoSnap, context] =
        await Promise.all([
          positionId ? db.collection('positions').doc(positionId).get() : null,
          personnelId
            ? db
                .collection('personnel_process_assignments')
                .where('personnel_id', '==', personnelId)
                .get()
            : null,
          personnelId
            ? db
                .collection('processDefinitions')
                .where('jefe_proceso_id', '==', personnelId)
                .get()
            : null,
          refresh
            ? UserContextService.refreshContext(targetUserId)
            : UserContextService.getUserFullContext(targetUserId),
        ]);

      const positionData = positionDoc?.exists
        ? ((positionDoc.data() || {}) as Record<string, unknown>)
        : null;

      const granularAssignments = (granularAssignmentsSnap?.docs || []).map(
        doc => {
          const data = (doc.data() || {}) as Record<string, unknown>;
          return {
            id: doc.id,
            estado: data.estado || 'activo',
            process_definition_id:
              typeof data.process_definition_id === 'string'
                ? data.process_definition_id
                : null,
            objetivos_asignados: Array.isArray(data.objetivos_asignados)
              ? uniqStrings(data.objetivos_asignados)
              : [],
            indicadores_asignados: Array.isArray(data.indicadores_asignados)
              ? uniqStrings(data.indicadores_asignados)
              : [],
          };
        }
      );

      const activeGranular = granularAssignments.filter(
        a => String(a.estado) !== 'inactivo'
      );

      const directProcessIds = Array.isArray(personnelData?.procesos_asignados)
        ? uniqStrings(personnelData.procesos_asignados)
        : [];
      const directObjectiveIds = Array.isArray(
        personnelData?.objetivos_asignados
      )
        ? uniqStrings(personnelData.objetivos_asignados)
        : [];
      const directIndicatorIds = Array.isArray(
        personnelData?.indicadores_asignados
      )
        ? uniqStrings(personnelData.indicadores_asignados)
        : [];

      const positionProcessIds = Array.isArray(positionData?.procesos_asignados)
        ? uniqStrings(positionData.procesos_asignados)
        : [];

      const granularProcessIds = uniqStrings(
        activeGranular.map(a => a.process_definition_id)
      );
      const granularObjectiveIds = uniqStrings(
        activeGranular.flatMap(a => a.objetivos_asignados)
      );
      const granularIndicatorIds = uniqStrings(
        activeGranular.flatMap(a => a.indicadores_asignados)
      );

      const jefeProcesoIds = (jefeProcesoSnap?.docs || [])
        .map(doc => doc.id)
        .filter(id => !!id);

      const panelProcessIds = Array.isArray((context as any)?.procesos)
        ? (context as any).procesos
            .map((p: any) => (typeof p?.id === 'string' ? p.id : null))
            .filter((id: string | null): id is string => !!id)
        : [];

      const findings: string[] = [];
      if (!personnelId) findings.push('Usuario sin personnel_id vinculado');
      if (personnelId && !personnelDoc?.exists) {
        findings.push(
          'user.personnel_id apunta a un documento de personnel inexistente'
        );
      }
      if (personnelData && !personnelData.user_id) {
        findings.push('Personnel sin user_id (vinculo inverso faltante)');
      }
      if (
        typeof personnelData?.user_id === 'string' &&
        personnelData.user_id !== targetUserId
      ) {
        findings.push(
          'Personnel.user_id no coincide con el userId autenticado'
        );
      }
      if (
        directProcessIds.length === 0 &&
        granularProcessIds.length > 0 &&
        panelProcessIds.length > 0
      ) {
        findings.push(
          'Asignaciones granulares existen; el panel las resolvio por fallback (agregado no sincronizado)'
        );
      }
      if (
        directProcessIds.length === 0 &&
        granularProcessIds.length === 0 &&
        positionProcessIds.length > 0 &&
        panelProcessIds.length > 0
      ) {
        findings.push(
          'Panel resolvio procesos desde asignaciones legacy del puesto (compatibilidad)'
        );
      }
      if (
        directProcessIds.length === 0 &&
        granularProcessIds.length === 0 &&
        positionProcessIds.length === 0
      ) {
        findings.push(
          'No hay asignaciones de procesos en personal, granular ni puesto'
        );
      }

      return NextResponse.json({
        targetUserId,
        refreshApplied: refresh,
        user: {
          id: userDoc.id,
          email: userData.email || null,
          rol: userData.rol || null,
          organization_id: userData.organization_id || null,
          personnel_id: personnelId,
        },
        personnel: personnelData
          ? {
              id: personnelDoc?.id || personnelId,
              user_id: personnelData.user_id || null,
              nombres: personnelData.nombres || null,
              apellidos: personnelData.apellidos || null,
              puesto: personnelData.puesto || null,
              puesto_id: personnelData.puesto_id || null,
              departamento: personnelData.departamento || null,
              departamento_id: personnelData.departamento_id || null,
            }
          : null,
        assignments: {
          direct_aggregates: {
            procesos_asignados: directProcessIds,
            objetivos_asignados: directObjectiveIds,
            indicadores_asignados: directIndicatorIds,
          },
          granular_active: {
            count: activeGranular.length,
            procesos_asignados: granularProcessIds,
            objetivos_asignados: granularObjectiveIds,
            indicadores_asignados: granularIndicatorIds,
          },
          position_legacy: {
            position_id: positionId,
            department_id: departmentId,
            procesos_asignados: positionProcessIds,
            objetivos_asignados: Array.isArray(
              positionData?.objetivos_asignados
            )
              ? uniqStrings(positionData.objetivos_asignados)
              : [],
            indicadores_asignados: Array.isArray(
              positionData?.indicadores_asignados
            )
              ? uniqStrings(positionData.indicadores_asignados)
              : [],
          },
        },
        jefe_proceso: {
          process_ids: jefeProcesoIds,
          count: jefeProcesoIds.length,
        },
        panel_effective_context: {
          procesos_count: panelProcessIds.length,
          procesos_ids: panelProcessIds,
          process_records_count: Array.isArray((context as any)?.processRecords)
            ? (context as any).processRecords.length
            : 0,
        },
        findings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Error in GET /api/context/user/diagnostics:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener diagnostico de contexto',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = RepairBodySchema.parse(await request.json());
      const targetUserId = body.userId || auth.uid;
      const dryRun = body.dryRun === true;
      const source = body.source || 'auto';

      const authError = await authorizeTargetUser(auth, targetUserId);
      if (authError) return authError;

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(targetUserId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const userData = (userDoc.data() || {}) as Record<string, unknown>;
      const personnelId =
        typeof userData.personnel_id === 'string'
          ? userData.personnel_id
          : null;
      if (!personnelId) {
        return NextResponse.json(
          { error: 'Usuario sin personnel_id vinculado' },
          { status: 400 }
        );
      }

      const personnelRef = db.collection('personnel').doc(personnelId);
      const personnelDoc = await personnelRef.get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Documento de personnel no encontrado' },
          { status: 404 }
        );
      }

      const personnelData = (personnelDoc.data() || {}) as Record<
        string,
        unknown
      >;
      const positionId =
        (typeof personnelData.puesto_id === 'string' &&
          personnelData.puesto_id) ||
        (typeof personnelData.puesto === 'string' && personnelData.puesto) ||
        null;

      const [granularAssignmentsSnap, positionDoc, jefeProcesoSnap] =
        await Promise.all([
          db
            .collection('personnel_process_assignments')
            .where('personnel_id', '==', personnelId)
            .get(),
          positionId ? db.collection('positions').doc(positionId).get() : null,
          db
            .collection('processDefinitions')
            .where('jefe_proceso_id', '==', personnelId)
            .get(),
        ]);

      const activeGranular = granularAssignmentsSnap.docs
        .map(
          doc =>
            ({
              id: doc.id,
              ...(doc.data() as Record<string, unknown>),
            }) as Record<string, unknown>
        )
        .filter(doc => String(doc['estado'] || 'activo') !== 'inactivo');

      const granularResolved = {
        procesos_asignados: uniqStrings(
          activeGranular.map(d => d.process_definition_id)
        ),
        objetivos_asignados: uniqStrings(
          activeGranular.flatMap(d =>
            Array.isArray(d.objetivos_asignados) ? d.objetivos_asignados : []
          )
        ),
        indicadores_asignados: uniqStrings(
          activeGranular.flatMap(d =>
            Array.isArray(d.indicadores_asignados)
              ? d.indicadores_asignados
              : []
          )
        ),
      };

      const positionData = positionDoc?.exists
        ? ((positionDoc.data() || {}) as Record<string, unknown>)
        : null;
      const positionResolved = {
        procesos_asignados: Array.isArray(positionData?.procesos_asignados)
          ? uniqStrings(positionData.procesos_asignados)
          : [],
        objetivos_asignados: Array.isArray(positionData?.objetivos_asignados)
          ? uniqStrings(positionData.objetivos_asignados)
          : [],
        indicadores_asignados: Array.isArray(
          positionData?.indicadores_asignados
        )
          ? uniqStrings(positionData.indicadores_asignados)
          : [],
      };

      const directCurrent = {
        procesos_asignados: Array.isArray(personnelData.procesos_asignados)
          ? uniqStrings(personnelData.procesos_asignados)
          : [],
        objetivos_asignados: Array.isArray(personnelData.objetivos_asignados)
          ? uniqStrings(personnelData.objetivos_asignados)
          : [],
        indicadores_asignados: Array.isArray(
          personnelData.indicadores_asignados
        )
          ? uniqStrings(personnelData.indicadores_asignados)
          : [],
      };

      const hasGranularData =
        granularResolved.procesos_asignados.length > 0 ||
        granularResolved.objetivos_asignados.length > 0 ||
        granularResolved.indicadores_asignados.length > 0;

      let chosenSource: 'granular' | 'position' = 'position';
      if (source === 'granular') {
        chosenSource = 'granular';
      } else if (source === 'position') {
        chosenSource = 'position';
      } else {
        chosenSource = hasGranularData ? 'granular' : 'position';
      }

      const resolved =
        chosenSource === 'granular' ? granularResolved : positionResolved;

      // Always merge jefe_proceso process IDs
      const jefeProcesoIds = (jefeProcesoSnap?.docs || [])
        .map(doc => doc.id)
        .filter(id => !!id);
      if (jefeProcesoIds.length > 0) {
        resolved.procesos_asignados = uniqStrings([
          ...resolved.procesos_asignados,
          ...jefeProcesoIds,
        ]);
      }

      const changed =
        JSON.stringify(directCurrent.procesos_asignados) !==
          JSON.stringify(resolved.procesos_asignados) ||
        JSON.stringify(directCurrent.objetivos_asignados) !==
          JSON.stringify(resolved.objetivos_asignados) ||
        JSON.stringify(directCurrent.indicadores_asignados) !==
          JSON.stringify(resolved.indicadores_asignados);

      if (!dryRun) {
        await personnelRef.update({
          procesos_asignados: resolved.procesos_asignados,
          objetivos_asignados: resolved.objetivos_asignados,
          indicadores_asignados: resolved.indicadores_asignados,
          updated_at: Timestamp.now(),
        });
      }

      UserContextService.invalidateCache(targetUserId);
      const refreshedContext =
        await UserContextService.refreshContext(targetUserId);

      return NextResponse.json({
        success: true,
        targetUserId,
        personnelId,
        dryRun,
        changed,
        source_requested: source,
        source_applied: chosenSource,
        hasGranularData,
        current: directCurrent,
        resolved,
        counts: {
          granular_assignments_active: activeGranular.length,
          panel_processes_after: Array.isArray(
            (refreshedContext as any)?.procesos
          )
            ? (refreshedContext as any).procesos.length
            : 0,
        },
        message: dryRun
          ? 'Diagnostico de re-sincronizacion (dry run)'
          : 'Asignaciones re-sincronizadas y cache invalidado',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Body invalido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Error in POST /api/context/user/diagnostics:', error);
      return NextResponse.json(
        {
          error: 'Error al re-sincronizar asignaciones del contexto',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
