import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  transitionOrganizationOnboardingPhase,
  validateOnboardingPhase,
} from '@/lib/onboarding/validatePhase';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { OnboardingMetricsService } from '@/services/onboarding/OnboardingMetricsService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const MetricsEventSchema = z.object({
  organization_id: z.string().optional(),
  system_id: z.string().optional(),
  session_id: z.string().min(1),
  event_type: z.enum([
    'onboarding_started',
    'onboarding_step_changed',
    'provision_requested',
    'provision_completed',
    'provision_failed',
    'onboarding_completed_ui',
    'onboarding_failed_ui',
    'strategy_checklist_viewed',
    'strategy_checklist_completed',
    'draft_generation_requested',
    'draft_generation_completed',
    'draft_generation_failed',
  ]),
  step: z.number().int().min(0).max(20).optional(),
  success: z.boolean().optional(),
  duration_ms: z.number().int().min(0).optional(),
  created_processes: z.number().int().min(0).optional(),
  skipped_processes: z.number().int().min(0).optional(),
  created_norm_points: z.number().int().min(0).optional(),
  skipped_norm_points: z.number().int().min(0).optional(),
  process_keys_count: z.number().int().min(0).optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const MetricsQuerySchema = z.object({
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = MetricsEventSchema.parse(await request.json());
      const adminDb = getAdminFirestore();
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organization_id || auth.organizationId,
        { requireOrg: true }
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 400,
          defaultError: 'organization_id es requerido',
          messageOverrides: {
            ORGANIZATION_MISMATCH:
              'No puedes registrar metricas de otra organizacion',
          },
        });
        return NextResponse.json(
          {
            success: false,
            error: orgError.error,
            errorCode: orgError.errorCode,
          },
          { status: orgError.status }
        );
      }
      const requestedOrgId = orgScope.organizationId;

      const expectedPhase =
        body.event_type === 'onboarding_started'
          ? 'not_started'
          : body.event_type === 'onboarding_step_changed' &&
              typeof body.step === 'number' &&
              body.step >= 1
            ? 'started'
            : body.event_type === 'provision_requested'
              ? 'systems_selected'
              : body.event_type === 'provision_completed' ||
                  body.event_type === 'provision_failed'
                ? 'provisioning'
                : body.event_type === 'draft_generation_requested'
                  ? 'provisioned'
                  : undefined;

      if (expectedPhase) {
        const { valid, currentPhase } = await validateOnboardingPhase(
          requestedOrgId,
          expectedPhase,
          adminDb
        );
        if (!valid) {
          return NextResponse.json(
            {
              success: false,
              error: `Fase incorrecta. Se esperaba: ${expectedPhase}, actual: ${currentPhase}`,
            },
            { status: 409 }
          );
        }
      }

      const id = await OnboardingMetricsService.trackEvent({
        organizationId: requestedOrgId,
        systemId: body.system_id,
        sessionId: body.session_id,
        eventType: body.event_type,
        createdBy: auth.uid,
        step: body.step,
        success: body.success,
        durationMs: body.duration_ms,
        createdProcesses: body.created_processes,
        skippedProcesses: body.skipped_processes,
        createdNormPoints: body.created_norm_points,
        skippedNormPoints: body.skipped_norm_points,
        processKeysCount: body.process_keys_count,
        startedAt: body.started_at,
        finishedAt: body.finished_at,
        metadata: body.metadata,
      });

      const nextPhase =
        body.event_type === 'onboarding_started'
          ? 'started'
          : body.event_type === 'onboarding_step_changed' &&
              typeof body.step === 'number' &&
              body.step >= 1
            ? 'systems_selected'
            : body.event_type === 'provision_completed'
              ? 'provisioned'
              : body.event_type === 'draft_generation_completed'
                ? 'completed'
                : undefined;

      if (nextPhase) {
        await transitionOrganizationOnboardingPhase({
          orgId: requestedOrgId,
          nextPhase,
          adminDb,
          actor: {
            userId: auth.uid,
            userEmail: auth.user.email,
            userRole: auth.role,
          },
          details: {
            source: 'onboarding_metrics',
            event_type: body.event_type,
            metric_id: id,
            step: body.step ?? null,
          },
        });
      }

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[OnboardingMetrics][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno al registrar metricas' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['super_admin', 'admin', 'gerente', 'jefe'],
    allowNoOrg: true,
  }
);

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const query = MetricsQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
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
          defaultStatus: 400,
          defaultError: 'organization_id es requerido',
          messageOverrides: {
            ORGANIZATION_MISMATCH:
              'No puedes leer metricas de otra organizacion',
          },
        });
        return NextResponse.json(
          {
            success: false,
            error: orgError.error,
            errorCode: orgError.errorCode,
          },
          { status: orgError.status }
        );
      }
      const effectiveOrgId = orgScope.organizationId;

      const limit = query.limit || 20;

      const data = await OnboardingMetricsService.getOrganizationOverview(
        effectiveOrgId,
        limit
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[OnboardingMetrics][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno al leer metricas' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['super_admin', 'admin', 'gerente', 'jefe'],
    allowNoOrg: true,
  }
);
