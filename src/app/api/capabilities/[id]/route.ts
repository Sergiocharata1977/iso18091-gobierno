import { withAuth } from '@/lib/api/withAuth';
import { EVENTS } from '@/lib/analytics/events';
import { captureServerEvent } from '@/lib/analytics/server';
import { deleteCapabilityRequestSchema } from '@/lib/validations/plugins';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  capabilityErrorResponse,
  resolveCapabilityId,
  resolveCapabilityOrganizationId,
} from '../_shared';

const deleteRequestSchema = z
  .object({
    organization_id: z.string().optional(),
    organizationId: z.string().optional(),
    capability_id: z.string().optional(),
    capabilityId: z.string().optional(),
  })
  .transform(body =>
    deleteCapabilityRequestSchema.omit({ capability_id: true }).parse({
      organization_id: body.organization_id || body.organizationId,
    })
  );

export const DELETE = withAuth(
  async (request, context, auth) => {
    try {
      const capabilityId = await resolveCapabilityId(context);
      if (!capabilityId) {
        return NextResponse.json(
          { success: false, error: 'capability_id requerido' },
          { status: 400 }
        );
      }

      const rawBody = await request.text();
      const parsedBody = rawBody.length
        ? JSON.parse(rawBody)
        : {
            organization_id:
              request.nextUrl.searchParams.get('organization_id') || undefined,
          };
      const body = deleteRequestSchema.parse(parsedBody);
      const organizationScope = await resolveCapabilityOrganizationId({
        request,
        auth,
        organizationIdFromBody: body.organization_id,
      });
      if (!organizationScope.ok) {
        return organizationScope.response;
      }
      const organizationId = organizationScope.organizationId;

      await CapabilityService.deleteInstalledCapability({
        organizationId,
        capabilityId,
        userId: auth.uid,
      });

      try {
        if (capabilityId === 'crm') {
          await captureServerEvent({
            event: EVENTS.CRM_PLUGIN_UNINSTALLED,
            distinctId: auth.uid,
            organizationId,
            properties: {
              capability: capabilityId,
            },
          });
        }
      } catch (analyticsError) {
        console.warn(
          '[capabilities/[id]][DELETE] Analytics warning:',
          analyticsError
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido' },
          { status: 400 }
        );
      }

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return capabilityErrorResponse(
        error,
        'No se pudo desinstalar la capability',
        '[capabilities/[id]][DELETE] Error:'
      );
    }
  },
  { roles: ['admin'] }
);
