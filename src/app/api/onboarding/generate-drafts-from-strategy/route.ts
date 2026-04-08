import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  transitionOrganizationOnboardingPhase,
  validateOnboardingPhase,
} from '@/lib/onboarding/validatePhase';
import { evaluateStrategyCompleteness } from '@/lib/onboarding/strategyCompleteness';
import { isOnboardingOwner } from '@/lib/onboarding/resolveOnboardingOwner';
import {
  generateDraftsFromStrategyRequestSchema,
  generateDraftsFromStrategyResponseSchema,
} from '@/lib/validations/onboarding-strategy';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { OrganizationOnboardingService } from '@/services/onboarding/OrganizationOnboardingService';
import { OnboardingMetricsService } from '@/services/onboarding/OnboardingMetricsService';
import { StrategyDrivenDraftGenerationService } from '@/services/onboarding/StrategyDrivenDraftGenerationService';
import { PLAN_COLLECTIONS } from '@/types/planificacion';
import type {
  GenerateDraftsFromStrategyRequest,
  GenerateDraftsFromStrategyResponse,
} from '@/types/onboarding-strategy';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type FirestoreTimestampLike = {
  toDate?: () => Date;
  _seconds?: number;
};

type PlanRecord = Record<string, unknown> | null;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FirestoreTimestampLike).toDate === 'function'
  ) {
    const parsed = (value as FirestoreTimestampLike).toDate?.();
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FirestoreTimestampLike)._seconds === 'number'
  ) {
    const parsed = new Date((value as FirestoreTimestampLike)._seconds! * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toMillis(value: unknown): number {
  return toDate(value)?.getTime() ?? 0;
}

function getEstadoRank(value: unknown): number {
  const estado = normalizeText(value);
  if (estado === 'vigente') return 3;
  if (estado === 'borrador') return 2;
  if (estado === 'historico') return 1;
  return 0;
}

function getVersion(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function pickBestPlanRecord(records: Record<string, unknown>[]): PlanRecord {
  if (records.length === 0) return null;

  let best: Record<string, unknown> | null = null;
  let bestScore: [number, number, number] = [0, 0, 0];
  for (const record of records) {
    const score: [number, number, number] = [
      getEstadoRank(record.estado),
      getVersion(record.version_numero),
      Math.max(
        toMillis(record.fecha_vigencia),
        toMillis(record.updated_at),
        toMillis(record.created_at)
      ),
    ];

    if (
      !best ||
      score[0] > bestScore[0] ||
      (score[0] === bestScore[0] && score[1] > bestScore[1]) ||
      (score[0] === bestScore[0] &&
        score[1] === bestScore[1] &&
        score[2] > bestScore[2])
    ) {
      best = record;
      bestScore = score;
    }
  }

  return best;
}

async function loadStrategyPlanRecords(organizationId: string) {
  const db = getAdminFirestore();
  const entries = await Promise.all(
    Object.entries(PLAN_COLLECTIONS).map(async ([key, collectionName]) => {
      const snapshot = await db
        .collection(collectionName)
        .where('organization_id', '==', organizationId)
        .get();

      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      }));

      return [key, pickBestPlanRecord(records)] as const;
    })
  );

  return Object.fromEntries(entries) as {
    identidad: PlanRecord;
    alcance: PlanRecord;
    contexto: PlanRecord;
    estructura: PlanRecord;
    politicas: PlanRecord;
  };
}

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    let parsedBody: GenerateDraftsFromStrategyRequest | null = null;
    let effectiveOrgId: string | null = null;
    const requestStartedAt = new Date();
    const sessionId = `plan19-${auth.uid}-${requestStartedAt.getTime()}`;

    try {
      parsedBody = generateDraftsFromStrategyRequestSchema.parse(
        await request.json()
      );

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        parsedBody.organization_id || auth.organizationId,
        { requireOrg: true }
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'No puedes generar borradores para otra organizacion',
        });
        return NextResponse.json(
          {
            ok: false,
            error: orgError.error,
            errorCode: orgError.errorCode,
          },
          { status: orgError.status }
        );
      }

      effectiveOrgId = orgScope.organizationId;
      const adminDb = getAdminFirestore();

      const { valid, currentPhase } = await validateOnboardingPhase(
        effectiveOrgId,
        'provisioned',
        adminDb
      );
      if (!valid) {
        return NextResponse.json(
          {
            ok: false,
            error: `Fase incorrecta. Se esperaba: provisioned, actual: ${currentPhase}`,
          },
          { status: 409 }
        );
      }

      const onboardingState =
        await OrganizationOnboardingService.getOrganizationOnboardingState(
          effectiveOrgId
        );
      if (onboardingState?.onboarding_phase === 'draft_generation_running') {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Ya hay una generación de borradores en curso para esta organizacion',
          },
          { status: 409 }
        );
      }
      const ownerResolution = isOnboardingOwner(
        { id: auth.user.id, uid: auth.uid, rol: auth.user.rol },
        { onboarding_owner_user_id: onboardingState?.owner?.user_id || null }
      );

      if (!ownerResolution.isOwner) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Solo el responsable de onboarding/calidad puede generar borradores',
          },
          { status: 403 }
        );
      }

      const planRecords = await loadStrategyPlanRecords(effectiveOrgId);
      const checklist = evaluateStrategyCompleteness(planRecords);
      if (!checklist.canGenerateDrafts) {
        return NextResponse.json(
          {
            ok: false,
            error: 'La estrategia no esta completa para generar borradores',
            missingRequired: checklist.missingRequired.map(item => item.code),
          },
          { status: 400 }
        );
      }

      try {
        await OnboardingMetricsService.trackEvent({
          organizationId: effectiveOrgId,
          systemId: parsedBody.system_id,
          sessionId,
          eventType: 'draft_generation_requested',
          createdBy: auth.uid,
          success: true,
          startedAt: requestStartedAt.toISOString(),
          metadata: {
            force_regenerate: parsedBody.force_regenerate === true,
            checklist_progress_percent: checklist.percent,
          },
        });
      } catch {
        // best effort
      }

      await OrganizationOnboardingService.markOnboardingPhase({
        organization_id: effectiveOrgId,
        onboarding_phase: 'draft_generation_running',
        system_id: parsedBody.system_id,
      });

      const generation =
        await StrategyDrivenDraftGenerationService.generateDraftsFromStrategy({
          organizationId: effectiveOrgId,
          systemId: parsedBody.system_id,
          userId: auth.uid,
          userEmail: auth.user.email,
          strategy: planRecords,
          forceRegenerate: parsedBody.force_regenerate,
        });

      const nextPhase =
        generation.summary.errors.length > 0 &&
        generation.summary.created.length === 0
          ? 'strategy_complete'
          : 'drafts_generated';

      await OrganizationOnboardingService.markOnboardingPhase({
        organization_id: effectiveOrgId,
        onboarding_phase: nextPhase,
        system_id: parsedBody.system_id,
      });
      await transitionOrganizationOnboardingPhase({
        orgId: effectiveOrgId,
        nextPhase: 'completed',
        adminDb,
        actor: {
          userId: auth.uid,
          userEmail: auth.user.email,
          userRole: auth.role,
        },
        details: {
          source: 'api/onboarding/generate-drafts-from-strategy',
          strategy_phase: nextPhase,
          system_id: parsedBody.system_id,
          generated_errors: generation.summary.errors.length,
        },
      });

      const response: GenerateDraftsFromStrategyResponse = {
        ok: generation.summary.errors.length === 0,
        onboardingPhase:
          nextPhase as GenerateDraftsFromStrategyResponse['onboardingPhase'],
        summary: generation.summary,
        generatedAt: generation.generatedAt,
      };

      try {
        await OnboardingMetricsService.trackEvent({
          organizationId: effectiveOrgId,
          systemId: parsedBody.system_id,
          sessionId,
          eventType: response.ok
            ? 'draft_generation_completed'
            : 'draft_generation_failed',
          createdBy: auth.uid,
          success: response.ok,
          startedAt: requestStartedAt.toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Math.max(0, Date.now() - requestStartedAt.getTime()),
          createdProcesses: response.summary.created.filter(item =>
            item.startsWith('proceso:')
          ).length,
          skippedProcesses: response.summary.skipped.filter(item =>
            item.startsWith('proceso:')
          ).length,
          metadata: {
            force_regenerate: parsedBody.force_regenerate === true,
            errors_count: response.summary.errors.length,
            next_phase: response.onboardingPhase,
          },
        });
      } catch {
        // best effort
      }

      const parsed = generateDraftsFromStrategyResponseSchema.parse(response);
      return NextResponse.json(parsed);
    } catch (error) {
      if (effectiveOrgId && parsedBody) {
        try {
          await OrganizationOnboardingService.markOnboardingPhase({
            organization_id: effectiveOrgId,
            onboarding_phase: 'strategy_complete',
            system_id: parsedBody.system_id,
          });
        } catch {
          // no-op best effort rollback de fase
        }
        try {
          await OnboardingMetricsService.trackEvent({
            organizationId: effectiveOrgId,
            systemId: parsedBody.system_id,
            sessionId,
            eventType: 'draft_generation_failed',
            createdBy: auth.uid,
            success: false,
            startedAt: requestStartedAt.toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Math.max(0, Date.now() - requestStartedAt.getTime()),
            metadata: {
              error:
                error instanceof Error
                  ? error.message
                  : 'Error generando borradores',
              force_regenerate: parsedBody.force_regenerate === true,
            },
          });
        } catch {
          // best effort
        }
      }

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Payload invalido',
            details: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 }
        );
      }

      console.error(
        '[POST /api/onboarding/generate-drafts-from-strategy] Error:',
        error
      );
      return NextResponse.json(
        {
          ok: false,
          error: 'Error interno generando borradores',
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['super_admin', 'admin', 'gerente', 'jefe'],
    allowNoOrg: true,
  }
);
