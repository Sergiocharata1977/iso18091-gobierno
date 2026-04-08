import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { evaluateStrategyCompleteness } from '@/lib/onboarding/strategyCompleteness';
import { isOnboardingOwner } from '@/lib/onboarding/resolveOnboardingOwner';
import { getOnboardingStrategyStatusResponseSchema } from '@/lib/validations/onboarding-strategy';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { OrganizationOnboardingService } from '@/services/onboarding/OrganizationOnboardingService';
import { PLAN_COLLECTIONS } from '@/types/planificacion';
import type {
  GetOnboardingStrategyStatusResponse,
  OnboardingPhase,
} from '@/types/onboarding-strategy';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const StrategyStatusQuerySchema = z.object({
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
  system_id: z.string().optional(),
  systemId: z.string().optional(),
});

const STRATEGY_PHASES = new Set<OnboardingPhase>([
  'pending_assignment',
  'strategy_pending',
  'strategy_in_progress',
  'strategy_complete',
  'draft_generation_running',
  'drafts_generated',
  'onboarding_completed',
]);

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

function toIsoString(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
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

async function loadStrategyPlanRecords(organizationId: string): Promise<{
  identidad: PlanRecord;
  alcance: PlanRecord;
  contexto: PlanRecord;
  estructura: PlanRecord;
  politicas: PlanRecord;
}> {
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

function mapChecklist(
  result: ReturnType<typeof evaluateStrategyCompleteness>
): GetOnboardingStrategyStatusResponse['checklist'] {
  const missingRequiredSections = Array.from(
    new Set(result.missingRequired.map(item => item.section))
  );

  return {
    progressPercent: result.percent,
    items: result.items.map(item => ({
      key: item.key,
      label: item.label,
      status: item.status,
      required: true,
      completed: item.status === 'complete',
      missingFields: item.missingRequired.length
        ? item.missingRequired
        : undefined,
      detail: `${item.completed}/${item.total}`,
    })),
    missingRequired: missingRequiredSections,
    canGenerateDrafts: result.canGenerateDrafts,
  };
}

function resolveStrategyPhase(args: {
  rawPhase?: string | null;
  hasExplicitOwner: boolean;
  checklistProgressPercent: number;
  canGenerateDrafts: boolean;
}): OnboardingPhase {
  const raw = normalizeText(args.rawPhase);

  if (STRATEGY_PHASES.has(raw as OnboardingPhase)) {
    return raw as OnboardingPhase;
  }

  if (!args.hasExplicitOwner) {
    return 'pending_assignment';
  }

  if (raw === 'provisioning') return 'draft_generation_running';
  if (raw === 'provisioned') return 'drafts_generated';
  if (raw === 'completed') return 'onboarding_completed';

  if (args.canGenerateDrafts) return 'strategy_complete';
  if (args.checklistProgressPercent > 0) return 'strategy_in_progress';
  return 'strategy_pending';
}

function resolveNextAction(args: {
  phase: OnboardingPhase;
  isOwner: boolean;
  ctaEnabled: boolean;
  canGenerateDrafts: boolean;
}): string {
  const { phase, isOwner, ctaEnabled, canGenerateDrafts } = args;

  if (phase === 'onboarding_completed') return 'completed';
  if (phase === 'draft_generation_running') return 'wait_draft_generation';

  if (!isOwner) {
    if (phase === 'pending_assignment') return 'wait_owner_assignment';
    return 'wait_owner';
  }

  if (!ctaEnabled) return 'wait';

  if (phase === 'pending_assignment') return 'assign_owner';
  if (phase === 'strategy_pending' || phase === 'strategy_in_progress') {
    return 'complete_strategy';
  }
  if (phase === 'strategy_complete') {
    return canGenerateDrafts ? 'generate_drafts' : 'complete_strategy';
  }
  if (phase === 'drafts_generated') return 'review_generated_drafts';

  return 'continue';
}

function resolveCtaEnabled(args: {
  phase: OnboardingPhase;
  isOwner: boolean;
  canGenerateDrafts: boolean;
}): boolean {
  const { phase, isOwner, canGenerateDrafts } = args;
  if (!isOwner) return false;

  switch (phase) {
    case 'pending_assignment':
    case 'strategy_pending':
    case 'strategy_in_progress':
      return true;
    case 'strategy_complete':
      return canGenerateDrafts;
    case 'drafts_generated':
      return true;
    case 'draft_generation_running':
    case 'onboarding_completed':
    default:
      return false;
  }
}

export const GET = withAuth(async (request: NextRequest, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    StrategyStatusQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const requestedOrgId =
      searchParams.get('organization_id') ||
      searchParams.get('organizationId') ||
      auth.organizationId;

    const orgScope = await resolveAuthorizedOrganizationId(
      auth,
      requestedOrgId,
      {
        requireOrg: true,
      }
    );

    if (!orgScope.ok || !orgScope.organizationId) {
      const orgError = toOrganizationApiError(orgScope, {
        defaultStatus: 403,
        defaultError:
          'No puedes consultar el estado de onboarding de otra organizacion',
      });
      return NextResponse.json(
        {
          error: orgError.error,
          errorCode: orgError.errorCode,
        },
        { status: orgError.status }
      );
    }

    const systemId =
      searchParams.get('system_id') ||
      searchParams.get('systemId') ||
      undefined;

    const effectiveOrgId = orgScope.organizationId;
    const onboardingStateRaw =
      await OrganizationOnboardingService.getOrganizationOnboardingState(
        effectiveOrgId
      );

    const planRecords = await loadStrategyPlanRecords(effectiveOrgId);
    const rawChecklist = evaluateStrategyCompleteness(planRecords);
    const checklist = mapChecklist(rawChecklist);

    const hasExplicitOwner = Boolean(
      normalizeText(onboardingStateRaw?.owner?.user_id || '')
    );

    const onboardingPhase = resolveStrategyPhase({
      rawPhase: onboardingStateRaw?.onboarding_phase,
      hasExplicitOwner,
      checklistProgressPercent: checklist.progressPercent,
      canGenerateDrafts: checklist.canGenerateDrafts,
    });

    const onboardingState: GetOnboardingStrategyStatusResponse['onboardingState'] =
      {
        organization_id: effectiveOrgId,
        onboarding_phase: onboardingPhase,
        onboarding_owner_user_id: onboardingStateRaw?.owner?.user_id || null,
        onboarding_system_id: systemId || onboardingStateRaw?.system_id || null,
        onboarding_started_at:
          toIsoString(onboardingStateRaw?.created_at) ||
          toIsoString(onboardingStateRaw?.phase_updated_at),
        onboarding_completed_at: toIsoString(onboardingStateRaw?.completed_at),
      };

    const ownerResolution = isOnboardingOwner(
      {
        id: auth.user.id,
        uid: auth.uid,
        rol: auth.user.rol,
      },
      {
        onboarding_owner_user_id: onboardingState.onboarding_owner_user_id,
      }
    );

    const ctaEnabled = resolveCtaEnabled({
      phase: onboardingState.onboarding_phase,
      isOwner: ownerResolution.isOwner,
      canGenerateDrafts: checklist.canGenerateDrafts,
    });

    const response: GetOnboardingStrategyStatusResponse = {
      onboardingState,
      checklist,
      isOwner: ownerResolution.isOwner,
      ctaEnabled,
      nextAction: resolveNextAction({
        phase: onboardingState.onboarding_phase,
        isOwner: ownerResolution.isOwner,
        ctaEnabled,
        canGenerateDrafts: checklist.canGenerateDrafts,
      }),
    };

    const parsed = getOnboardingStrategyStatusResponseSchema.parse(response);
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Parametros invalidos',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('[GET /api/onboarding/strategy-status] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
