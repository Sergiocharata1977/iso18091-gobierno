/**
 * GET /api/agentic-center/summary
 *
 * Devuelve los contadores del Centro Agéntico para la organización
 * del usuario autenticado. Todos los conteos son org-scoped.
 *
 * Usa datos reales de Firestore con fallback a cero cuando la colección
 * no existe o está vacía.
 */

import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import type { AgenticCenterSummary } from '@/types/agentic-center';
import { AgenticCenterCaseMapper } from '@/services/agentic-center/AgenticCenterCaseMapper';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_req, _context, auth) => {
    const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
      requireOrg: true,
    });

    if (!orgScope.ok || !orgScope.organizationId) {
      const apiError = toOrganizationApiError(orgScope);
      return NextResponse.json(
        { success: false, error: apiError.error, errorCode: apiError.errorCode },
        { status: apiError.status }
      );
    }

    const orgId = orgScope.organizationId;
    const db = getAdminFirestore();
    const mapper = new AgenticCenterCaseMapper();

    // Cada contador se resuelve de forma independiente.
    // Si la colección no existe o lanza error, el contador queda en 0.

    const [
      directActionsPendientes,
      sagasPausadas,
      jobsActivos,
      terminalesConAprobacion,
      pendingApprovalsCount,
      blockedSagasCount,
      failedJobsCount,
    ] = await Promise.all([
      // 1. Acciones directas pendientes de confirmación — org-scoped via userId
      mapper.countPendingApprovals(orgId, db),

      // 2. Flujos multi-paso (sagas) pausados esperando aprobación humana — org-scoped
      (async (): Promise<number> => {
        try {
          const snap = await db
            .collection('agent_sagas')
            .where('organization_id', '==', orgId)
            .where('status', '==', 'paused')
            .get();
          return snap.size;
        } catch {
          return 0;
        }
      })(),

      // 3. Trabajos del motor en ejecución o en cola — org-scoped
      (async (): Promise<number> => {
        try {
          const [queuedSnap, runningSnap] = await Promise.all([
            db
              .collection('agent_jobs')
              .where('organization_id', '==', orgId)
              .where('status', '==', 'queued')
              .get(),
            db
              .collection('agent_jobs')
              .where('organization_id', '==', orgId)
              .where('status', '==', 'running')
              .get(),
          ]);
          return queuedSnap.size + runningSnap.size;
        } catch {
          return 0;
        }
      })(),

      // 4. Terminales Sentinel con solicitudes de aprobación pendientes — org-scoped
      (async (): Promise<number> => {
        try {
          const snap = await db
            .collection('terminales')
            .where('organization_id', '==', orgId)
            .where('status', '==', 'pending')
            .get();
          return snap.size;
        } catch {
          return 0;
        }
      })(),

      // 5. pending_approvals_count — conteo real org-scoped de confirmaciones pendientes
      mapper.countPendingApprovals(orgId, db),

      // 6. blocked_sagas_count — sagas pausadas + fallidas para la org
      mapper.countBlockedSagas(orgId, db),

      // 7. failed_jobs_count — jobs fallidos en los últimos 7 días para la org
      mapper.countFailedJobs(orgId, db),
    ]);

    // personas_impactadas: estimación basada en sagas pausadas + acciones pendientes.
    // Cada saga pausada y cada acción pendiente puede impactar al menos una persona.
    const personasImpactadas = sagasPausadas + directActionsPendientes;

    const summary: AgenticCenterSummary = {
      jobs_activos: jobsActivos,
      sagas_pausadas: sagasPausadas,
      direct_actions_pendientes: directActionsPendientes,
      terminales_con_aprobacion: terminalesConAprobacion,
      personas_impactadas: personasImpactadas,
      pending_approvals_count: pendingApprovalsCount,
      blocked_sagas_count: blockedSagasCount,
      failed_jobs_count: failedJobsCount,
    };

    return NextResponse.json({ success: true, data: summary });
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
