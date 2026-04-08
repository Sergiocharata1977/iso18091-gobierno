import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  ensureTenantSetupCapabilities,
  transitionOrganizationOnboardingPhase,
  validateOnboardingPhase,
} from '@/lib/onboarding/validatePhase';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { OnboardingMetricsService } from '@/services/onboarding/OnboardingMetricsService';
import { ISOTemplateProvisionService } from '@/services/onboarding/ISOTemplateProvisionService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ProvisionSchema = z.object({
  organization_id: z.string().optional(),
  system_id: z.string().optional(),
  company: z
    .object({
      name: z.string().min(1),
      cuit: z.string().optional(),
      sector: z.string().optional(),
      contact: z.string().optional(),
    })
    .optional(),
  tenant_type: z.string().optional(),
  norm: z.literal('iso_9001').default('iso_9001'),
  process_keys: z.array(z.string().min(1)).min(1),
  telemetry: z
    .object({
      session_id: z.string().min(1),
      started_at: z.string().optional(),
    })
    .optional(),
});

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    let parsedBody: z.infer<typeof ProvisionSchema> | null = null;
    let requestedOrgId: string | null = null;

    try {
      const body = ProvisionSchema.parse(await request.json());
      parsedBody = body;
      const adminDb = getAdminFirestore();
      requestedOrgId = body.organization_id || auth.organizationId;
      const systemId = body.system_id || 'iso9001';

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        requestedOrgId,
        { requireOrg: true }
      );
      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 400,
          defaultError:
            'organization_id es requerido para super_admin sin organizacion',
          messageOverrides: {
            ORGANIZATION_MISMATCH: 'No puedes provisionar otra organizacion',
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
      requestedOrgId = orgScope.organizationId;

      const tenantSetup = await ensureTenantSetupCapabilities({
        orgId: requestedOrgId,
        adminDb,
        userId: auth.uid,
        systemId,
        tenantType: body.tenant_type,
      });

      const { valid, currentPhase } = await validateOnboardingPhase(
        requestedOrgId,
        'systems_selected',
        adminDb
      );
      if (!valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Fase incorrecta. Se esperaba: systems_selected, actual: ${currentPhase}`,
          },
          { status: 409 }
        );
      }

      if (systemId !== 'iso9001') {
        return NextResponse.json(
          {
            success: false,
            error: `Onboarding para sistema '${systemId}' aun no implementado`,
          },
          { status: 400 }
        );
      }

      await transitionOrganizationOnboardingPhase({
        orgId: requestedOrgId,
        nextPhase: 'provisioning',
        adminDb,
        actor: {
          userId: auth.uid,
          userEmail: auth.user.email,
          userRole: auth.role,
        },
        details: {
          source: 'api/onboarding/provision',
          system_id: systemId,
          process_keys_count: body.process_keys.length,
        },
      });

      const result = await ISOTemplateProvisionService.provision({
        organizationId: requestedOrgId,
        processKeys: body.process_keys,
        createdBy: auth.uid,
        systemId,
      });
      const finishedAtIso = new Date().toISOString();
      let durationMs: number | undefined;

      if (body.telemetry?.started_at) {
        const startedAt = new Date(body.telemetry.started_at);
        if (!Number.isNaN(startedAt.getTime())) {
          durationMs = Math.max(0, Date.now() - startedAt.getTime());
        }
      }

      try {
        await OnboardingMetricsService.trackEvent({
          organizationId: requestedOrgId,
          sessionId:
            body.telemetry?.session_id || `provision-${auth.uid}-${Date.now()}`,
          eventType: 'provision_completed',
          createdBy: auth.uid,
          systemId,
          step: 3,
          success: true,
          durationMs,
          createdProcesses: result.createdProcesses,
          skippedProcesses: result.skippedProcesses,
          createdNormPoints: result.createdNormPoints,
          skippedNormPoints: result.skippedNormPoints,
          processKeysCount: body.process_keys.length,
          startedAt: body.telemetry?.started_at,
          finishedAt: finishedAtIso,
          metadata: {
            norm: body.norm,
            company_name: body.company?.name || null,
            system_id: systemId,
            tenant_type: tenantSetup.tenantType,
            crm_auto_installed: tenantSetup.crmInstalled,
          },
        });
      } catch (metricsError) {
        console.error(
          '[OnboardingProvision] Metrics tracking warning:',
          metricsError
        );
      }

      await transitionOrganizationOnboardingPhase({
        orgId: requestedOrgId,
        nextPhase: 'provisioned',
        adminDb,
        actor: {
          userId: auth.uid,
          userEmail: auth.user.email,
          userRole: auth.role,
        },
        details: {
          source: 'api/onboarding/provision',
          system_id: systemId,
          created_processes: result.createdProcesses,
          created_norm_points: result.createdNormPoints,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          organization_id: requestedOrgId,
          system_id: systemId,
          tenant_type: tenantSetup.tenantType,
          norm: body.norm,
          company: body.company || null,
          crm_auto_installed: tenantSetup.crmInstalled,
          crm_already_installed: tenantSetup.crmAlreadyInstalled,
          ...result,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payload invalido',
            details: error.issues,
          },
          { status: 400 }
        );
      }
      if (parsedBody && requestedOrgId) {
        try {
          await OnboardingMetricsService.trackEvent({
            organizationId: requestedOrgId,
            systemId: parsedBody.system_id || 'iso9001',
            sessionId:
              parsedBody.telemetry?.session_id ||
              `provision-${auth.uid}-${Date.now()}`,
            eventType: 'provision_failed',
            createdBy: auth.uid,
            step: 3,
            success: false,
            processKeysCount: parsedBody.process_keys.length,
            startedAt: parsedBody.telemetry?.started_at,
            finishedAt: new Date().toISOString(),
            metadata: {
              error:
                error instanceof Error
                  ? error.message
                  : 'Error interno en provision',
            },
          });
        } catch (metricsError) {
          console.error(
            '[OnboardingProvision] Metrics failure warning:',
            metricsError
          );
        }
      }

      console.error('[OnboardingProvision] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error interno en provision',
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
