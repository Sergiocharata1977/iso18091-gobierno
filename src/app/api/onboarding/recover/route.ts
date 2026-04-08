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
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RecoverSchema = z.object({
  organization_id: z.string().optional(),
  reason: z.string().trim().min(1).optional(),
});

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = RecoverSchema.parse(await request.json());
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
              'No puedes recuperar el onboarding de otra organizacion',
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

      const orgId = orgScope.organizationId;
      const { valid, currentPhase } = await validateOnboardingPhase(
        orgId,
        'provisioning',
        adminDb
      );

      if (!valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Fase incorrecta. Se esperaba: provisioning, actual: ${currentPhase}`,
          },
          { status: 409 }
        );
      }

      const transition = await transitionOrganizationOnboardingPhase({
        orgId,
        nextPhase: 'not_started',
        adminDb,
        actor: {
          userId: auth.uid,
          userEmail: auth.user.email,
          userRole: auth.role,
        },
        details: {
          source: 'api/onboarding/recover',
          reason: body.reason || 'manual_recovery',
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          organization_id: orgId,
          previous_phase: transition.previousPhase,
          current_phase: transition.currentPhase,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[POST /api/onboarding/recover] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno al recuperar onboarding' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'super_admin'],
    allowNoOrg: true,
  }
);
