import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { UserContextService } from '@/services/context/UserContextService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type VisualStatus = 'ok' | 'atencion' | 'critico' | 'sin_asignacion';

interface PersonnelDocLike {
  id: string;
  user_id?: string;
  nombres?: string;
  apellidos?: string;
  puesto?: string;
  departamento?: string;
  puesto_id?: string;
  departamento_id?: string;
  estado?: string;
  is_active?: boolean;
  indicadores_asignados?: string[];
  procesos_asignados?: string[];
  tiene_acceso_sistema?: boolean;
}

const ResumenUsuariosQuerySchema = z.object({
  q: z.string().optional(),
  departamento: z.string().optional(),
  puesto: z.string().optional(),
  estado: z.enum(['ok', 'atencion', 'critico', 'sin_asignacion']).optional(),
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
});

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as Record<string, unknown>)
  ) {
    const seconds = Number((value as Record<string, unknown>).seconds);
    if (!Number.isFinite(seconds)) return null;
    return new Date(seconds * 1000);
  }
  return null;
}

function daysForFrequency(freq?: string): number {
  switch ((freq || '').toLowerCase()) {
    case 'diaria':
      return 1;
    case 'semanal':
      return 7;
    case 'mensual':
      return 30;
    case 'trimestral':
      return 90;
    case 'anual':
      return 365;
    default:
      return 30;
  }
}

function ratioToPct(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0) return null;
  return Math.max(
    0,
    Math.min(100, Math.round((numerator / denominator) * 100))
  );
}

function avg(nums: Array<number | null>): number {
  const valid = nums.filter((n): n is number => typeof n === 'number');
  if (valid.length === 0) return 100;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      if (
        ![
          'admin',
          'gerente',
          'jefe',
          'operario',
          'auditor',
          'super_admin',
        ].includes(auth.role)
      ) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const query = ResumenUsuariosQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const q = (searchParams.get('q') || '').trim().toLowerCase();
      const filterDepto = (searchParams.get('departamento') || '').trim();
      const filterPuesto = (searchParams.get('puesto') || '').trim();
      const filterEstado = (searchParams.get('estado') || '')
        .trim()
        .toLowerCase();

      const requestedOrgId = query.organization_id || query.organizationId;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        requestedOrgId,
        {
          requireOrg: true,
        }
      );
      if (!orgScope.ok || !orgScope.organizationId) {
        return NextResponse.json(
          { error: orgScope.error || 'organization_id requerido para resumen' },
          { status: orgScope.status || 400 }
        );
      }
      const effectiveOrgId = orgScope.organizationId;

      const db = getAdminFirestore();

      const [personnelSnapshot, usersSnapshot] = await Promise.all([
        db
          .collection('personnel')
          .where('organization_id', '==', effectiveOrgId)
          .limit(500)
          .get(),
        db
          .collection('users')
          .where('organization_id', '==', effectiveOrgId)
          .limit(500)
          .get(),
      ]);

      const usersByPersonnelId = new Map<
        string,
        { uid: string; rol?: string }
      >();
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        const personnelId = data.personnel_id;
        if (typeof personnelId === 'string' && personnelId.trim()) {
          usersByPersonnelId.set(personnelId, {
            uid: doc.id,
            rol: data.rol,
          });
        }
      });

      let personnel = personnelSnapshot.docs
        .map(
          doc =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as PersonnelDocLike
        )
        .filter(p => {
          const activeByEstado = !p.estado || p.estado === 'Activo';
          const activeByFlag = p.is_active !== false;
          return activeByEstado && activeByFlag;
        });

      // Operario: solo puede ver su propio resumen personal
      if (auth.role === 'operario') {
        personnel = personnel.filter(p => {
          const linkedUserId = p.user_id || usersByPersonnelId.get(p.id)?.uid;
          return linkedUserId === auth.uid;
        });
      }

      const actionDocs = await db
        .collection('organizations')
        .doc(effectiveOrgId)
        .collection('crm_acciones')
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get()
        .catch(() => null);

      const actionsByUser = new Map<
        string,
        {
          total: number;
          abiertas: number;
          vencidas: number;
        }
      >();
      const now = new Date();

      actionDocs?.docs.forEach(doc => {
        const a = doc.data() || {};
        const uid =
          typeof a.vendedor_id === 'string' && a.vendedor_id.trim()
            ? a.vendedor_id.trim()
            : null;
        if (!uid) return;

        const current = actionsByUser.get(uid) || {
          total: 0,
          abiertas: 0,
          vencidas: 0,
        };
        current.total += 1;

        const estado = String(a.estado || '').toLowerCase();
        const isOpen = !['completada', 'cerrada', 'cancelada'].includes(estado);
        if (isOpen) current.abiertas += 1;

        const fecha = toDate(a.fecha_programada || a.fecha_vencimiento);
        if (isOpen && fecha && fecha < now) current.vencidas += 1;

        actionsByUser.set(uid, current);
      });

      const upcomingEventsSnapshot = await db
        .collection('calendar_events')
        .where('organizationId', '==', effectiveOrgId)
        .where('isActive', '==', true)
        .limit(1000)
        .get()
        .catch(() => null);

      const eventsByUser = new Map<string, number>();
      upcomingEventsSnapshot?.docs.forEach(doc => {
        const e = doc.data() || {};
        const uid =
          typeof e.responsibleUserId === 'string' ? e.responsibleUserId : null;
        if (!uid) return;
        const date = toDate(e.date);
        if (!date) return;
        const in7days =
          date >= now && date <= new Date(now.getTime() + 7 * 86400000);
        if (!in7days) return;
        eventsByUser.set(uid, (eventsByUser.get(uid) || 0) + 1);
      });

      const summaries = await Promise.all(
        personnel.map(async p => {
          const linkedUserId =
            p.user_id || usersByPersonnelId.get(p.id)?.uid || null;

          let procesosAsignados = Array.isArray(p.procesos_asignados)
            ? p.procesos_asignados.length
            : 0;
          let indicadoresAsignados = Array.isArray(p.indicadores_asignados)
            ? p.indicadores_asignados.length
            : 0;
          let registrosTotal = 0;
          let registrosPendientes = 0;
          let registrosVencidos = 0;
          let processCompletionPct: number | null = null;
          let medicionesPendientes = 0;
          let medicionesVencidas = 0;

          if (linkedUserId) {
            try {
              const ctx =
                await UserContextService.getUserFullContext(linkedUserId);
              procesosAsignados = ctx.procesos?.length || procesosAsignados;
              indicadoresAsignados =
                ctx.indicadores?.length || indicadoresAsignados;

              const records = ((ctx.processRecords || []) as any[]).filter(
                Boolean
              );
              registrosTotal = records.length;
              registrosPendientes = records.filter(
                r =>
                  String(r.estado || '').toLowerCase() !== 'completado' &&
                  String(r.estado || '').toLowerCase() !== 'completed'
              ).length;
              registrosVencidos = records.filter(r => {
                const estado = String(r.estado || '').toLowerCase();
                if (estado === 'completado' || estado === 'completed')
                  return false;
                const due = toDate(r.fecha_vencimiento);
                return !!due && due < now;
              }).length;
              processCompletionPct = ratioToPct(
                records.filter(r => {
                  const estado = String(r.estado || '').toLowerCase();
                  return estado === 'completado' || estado === 'completed';
                }).length,
                records.length
              );

              const indicators = ((ctx.indicadores || []) as any[]).filter(
                Boolean
              );
              indicators.forEach(ind => {
                const freqDays = daysForFrequency(ind.measurement_frequency);
                const lastDate = toDate(ind.last_measurement_date);
                if (!lastDate) {
                  medicionesPendientes += 1;
                  medicionesVencidas += 1;
                  return;
                }
                const dueDate = new Date(
                  lastDate.getTime() + freqDays * 86400000
                );
                if (dueDate <= now) {
                  medicionesPendientes += 1;
                  const overdueThreshold = new Date(
                    dueDate.getTime() +
                      Math.max(1, Math.floor(freqDays / 2)) * 86400000
                  );
                  if (overdueThreshold <= now) medicionesVencidas += 1;
                }
              });
            } catch (error) {
              console.warn(
                '[resumen-usuarios] Error armando contexto de usuario',
                linkedUserId,
                error
              );
            }
          }

          const actionMetrics = linkedUserId
            ? actionsByUser.get(linkedUserId) || {
                total: 0,
                abiertas: 0,
                vencidas: 0,
              }
            : { total: 0, abiertas: 0, vencidas: 0 };

          let estadoVisual: VisualStatus = 'ok';
          if (procesosAsignados === 0) estadoVisual = 'sin_asignacion';
          else if (
            registrosVencidos > 0 ||
            actionMetrics.vencidas > 0 ||
            medicionesVencidas > 0
          )
            estadoVisual = 'critico';
          else if (
            registrosPendientes > 0 ||
            actionMetrics.abiertas > 0 ||
            medicionesPendientes > 0
          )
            estadoVisual = 'atencion';

          const accionesRatio = ratioToPct(
            Math.max(0, actionMetrics.total - actionMetrics.abiertas),
            actionMetrics.total
          );
          const medicionesRatio = ratioToPct(
            Math.max(0, indicadoresAsignados - medicionesPendientes),
            indicadoresAsignados
          );

          const scoreCumplimiento = avg([
            processCompletionPct,
            accionesRatio,
            medicionesRatio,
          ]);

          const nombreCompleto =
            `${p.nombres || ''} ${p.apellidos || ''}`.trim();

          return {
            personnelId: p.id,
            userId: linkedUserId,
            nombreCompleto: nombreCompleto || 'Sin nombre',
            puesto: p.puesto || 'Sin puesto asignado',
            departamento: p.departamento || 'Sin departamento',
            estado: p.estado || 'Activo',
            tieneAccesoSistema: !!p.tiene_acceso_sistema,
            procesosAsignados,
            processCompletionPct,
            registrosTotal,
            registrosPendientes,
            tareasVencidas: registrosVencidos,
            accionesAbiertas: actionMetrics.abiertas,
            accionesVencidas: actionMetrics.vencidas,
            indicadoresAsignados,
            medicionesPendientes,
            medicionesVencidas,
            eventosProximos: linkedUserId
              ? eventsByUser.get(linkedUserId) || 0
              : 0,
            scoreCumplimiento,
            estadoVisual,
          };
        })
      );

      const filtered = summaries.filter(item => {
        if (q) {
          const hayTexto = [item.nombreCompleto, item.puesto, item.departamento]
            .join(' ')
            .toLowerCase()
            .includes(q);
          if (!hayTexto) return false;
        }
        if (filterDepto && item.departamento !== filterDepto) return false;
        if (filterPuesto && item.puesto !== filterPuesto) return false;
        if (filterEstado && item.estadoVisual !== filterEstado) return false;
        return true;
      });

      const total = filtered.length;
      const conPendientes = filtered.filter(
        i =>
          i.registrosPendientes > 0 ||
          i.accionesAbiertas > 0 ||
          i.medicionesPendientes > 0
      ).length;
      const sinAsignacion = filtered.filter(
        i => i.estadoVisual === 'sin_asignacion'
      ).length;
      const accionesVencidasGlobal = filtered.reduce(
        (sum, i) => sum + i.accionesVencidas,
        0
      );

      return NextResponse.json({
        data: filtered,
        filters: {
          departamentos: Array.from(
            new Set(filtered.map(i => i.departamento).filter(Boolean))
          ).sort(),
          puestos: Array.from(
            new Set(filtered.map(i => i.puesto).filter(Boolean))
          ).sort(),
          estados: ['ok', 'atencion', 'critico', 'sin_asignacion'],
        },
        resumenGlobal: {
          totalPersonalActivo: total,
          porcentajeConPendientes:
            total > 0 ? Math.round((conPendientes / total) * 100) : 0,
          porcentajeSinAsignacion:
            total > 0 ? Math.round((sinAsignacion / total) * 100) : 0,
          totalAccionesVencidasGlobal: accionesVencidasGlobal,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /mi-sgc/resumen-usuarios] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener resumen de usuarios',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
