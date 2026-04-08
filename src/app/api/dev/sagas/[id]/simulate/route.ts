/**
 * DEV ONLY — Simula eventos de jobs para una saga específica.
 * Permite completar/fallar/aprobar/rechazar pasos manualmente desde el playground.
 */
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SagaService } from '@/services/agents/SagaService';
import { SagaRun } from '@/types/sagas';
import { AgentJob } from '@/types/agents';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const SAGAS_COLLECTION = 'agent_sagas';

type SimulateAction =
  | 'complete'
  | 'fail'
  | 'pending_approval'
  | 'approve'
  | 'reject';

export const POST = withAuth(
  async (req, { params }, auth) => {
    const scope = await resolveAuthorizedOrganizationId(auth, undefined);
    if (!scope.ok || !scope.organizationId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    const orgId = scope.organizationId;
    const { id: sagaId } = await params;

    const db = getAdminFirestore();

    // Cargar la saga
    const sagaDoc = await db.collection(SAGAS_COLLECTION).doc(sagaId).get();
    if (!sagaDoc.exists) {
      return NextResponse.json({ error: 'Saga no encontrada' }, { status: 404 });
    }

    const saga = { id: sagaId, ...(sagaDoc.data() as Omit<SagaRun, 'id'>) };

    // Verificar ownership
    if (saga.organization_id !== orgId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action as SimulateAction;
    const stepId = body.step_id as string | undefined;
    const result = body.result ?? { status: 'ok', _simulated: true };
    const errorCode = (body.error_code as string) ?? 'SIMULATED_ERROR';
    const errorMessage = (body.error_message as string) ?? 'Error simulado desde playground';
    const feedback = body.feedback as string | undefined;

    if (!action) {
      return NextResponse.json(
        { error: 'Requerido: action (complete|fail|pending_approval|approve|reject)' },
        { status: 400 }
      );
    }

    // Para acciones que necesitan step_id, encontrar el paso
    let fakeJob: AgentJob | null = null;

    if (stepId) {
      const step = saga.steps.find(s => s.id === stepId);
      if (!step) {
        return NextResponse.json(
          { error: `Paso '${stepId}' no encontrado en la saga` },
          { status: 400 }
        );
      }

      if (!step.job_id && action !== 'pending_approval') {
        return NextResponse.json(
          {
            error: `El paso '${stepId}' no tiene job_id asignado aún (status: ${step.status}). Solo pasos en status 'running' pueden simularse.`,
            step_status: step.status,
          },
          { status: 400 }
        );
      }

      // Construir un AgentJob ficticio que matchee el job_id del paso
      fakeJob = {
        id: step.job_id ?? `dev-sim:${Date.now()}:${stepId}`,
        organization_id: saga.organization_id,
        user_id: saga.user_id,
        agent_instance_id: step.assigned_agent_id ?? 'dev-simulator',
        intent: step.intent,
        payload: step.payload,
        workflow_id: sagaId,
        step_index: saga.steps.indexOf(step),
        status: 'completed',
        priority: 'normal',
        attempts: 1,
        max_attempts: 3,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    // Ejecutar la acción simulada
    switch (action) {
      case 'complete': {
        if (!fakeJob) {
          return NextResponse.json(
            { error: 'complete requiere step_id' },
            { status: 400 }
          );
        }
        await SagaService.onJobComplete(fakeJob, result);
        break;
      }

      case 'fail': {
        if (!fakeJob) {
          return NextResponse.json(
            { error: 'fail requiere step_id' },
            { status: 400 }
          );
        }
        fakeJob.status = 'failed';
        await SagaService.onJobFailed(fakeJob, {
          code: errorCode,
          message: errorMessage,
        });
        break;
      }

      case 'pending_approval': {
        if (!stepId) {
          return NextResponse.json(
            { error: 'pending_approval requiere step_id' },
            { status: 400 }
          );
        }
        const step = saga.steps.find(s => s.id === stepId);
        const jobForApproval: AgentJob = {
          id: step?.job_id ?? `dev-approval:${Date.now()}`,
          organization_id: saga.organization_id,
          user_id: saga.user_id,
          agent_instance_id: 'dev-simulator',
          intent: step?.intent ?? 'unknown',
          payload: step?.payload ?? {},
          workflow_id: sagaId,
          status: 'pending_approval',
          priority: 'normal',
          attempts: 1,
          max_attempts: 3,
          created_at: new Date(),
          updated_at: new Date(),
        };
        await SagaService.onJobPendingApproval(jobForApproval);
        break;
      }

      case 'approve': {
        if (!fakeJob) {
          return NextResponse.json(
            { error: 'approve requiere step_id' },
            { status: 400 }
          );
        }
        fakeJob.status = 'pending_approval';
        await SagaService.onJobApprovalResolved(fakeJob, true, feedback);
        break;
      }

      case 'reject': {
        if (!fakeJob) {
          return NextResponse.json(
            { error: 'reject requiere step_id' },
            { status: 400 }
          );
        }
        fakeJob.status = 'pending_approval';
        await SagaService.onJobApprovalResolved(
          fakeJob,
          false,
          feedback ?? 'Rechazado desde playground'
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: `Acción desconocida: ${action}` },
          { status: 400 }
        );
    }

    // Leer saga actualizada y devolver
    const updatedDoc = await db.collection(SAGAS_COLLECTION).doc(sagaId).get();
    const updatedSaga = { id: sagaId, ...(updatedDoc.data() as Omit<SagaRun, 'id'>) };

    return NextResponse.json({
      ok: true,
      action,
      step_id: stepId,
      saga: updatedSaga,
    });
  },
  { roles: ['admin', 'gerente'] }
);
