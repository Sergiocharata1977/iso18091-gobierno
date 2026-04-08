import type { Edition } from '@/types/edition';
import { withAuth } from '@/lib/api/withAuth';
import { OrganizationBootstrapService } from '@/services/onboarding/OrganizationBootstrapService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BootstrapSchema = z.object({
  organization_name: z.string().min(1),
  tenant_type: z.string().min(1),
  edition: z.enum(['enterprise', 'government']).optional(),
  owner_name: z.string().min(1),
  owner_email: z.string().email(),
  industry: z.string().min(1).optional(),
  plan_intent: z.string().min(1).optional(),
});

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = BootstrapSchema.parse(await request.json());
      const edition: Edition = body.edition ?? 'enterprise';

      const onboardingState =
        await OrganizationBootstrapService.bootstrapOrganization({
          actor_user_id: auth.uid,
          actor_email: auth.user.email,
          actor_organization_id: auth.organizationId || null,
          organization_name: body.organization_name,
          tenant_type: body.tenant_type,
          edition,
          owner_name: body.owner_name,
          owner_email: body.owner_email,
          industry: body.industry,
          plan_intent: body.plan_intent,
        });

      return NextResponse.json(
        {
          success: true,
          data: onboardingState,
        },
        { status: 201 }
      );
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

      console.error('[OnboardingBootstrap] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Error interno al iniciar onboarding comercial',
        },
        { status: 500 }
      );
    }
  },
  {
    allowNoOrg: true,
    allowInactive: true,
  }
);
