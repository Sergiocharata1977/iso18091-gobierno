import { withAuth } from '@/lib/api/withAuth';
import { toggleCapabilityRequestSchema } from '@/lib/validations/plugins';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  capabilityErrorResponse,
  resolveCapabilityId,
  resolveCapabilityOrganizationId,
} from '../../_shared';

const toggleRequestSchema = z
  .object({
    organization_id: z.string().optional(),
    organizationId: z.string().optional(),
    enabled: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .transform(body =>
    toggleCapabilityRequestSchema.omit({ capability_id: true }).parse({
      organization_id: body.organization_id || body.organizationId,
      enabled: body.enabled ?? body.active,
    })
  );

export const PUT = withAuth(
  async (request, context, auth) => {
    try {
      const capabilityId = await resolveCapabilityId(context);
      if (!capabilityId) {
        return NextResponse.json(
          { success: false, error: 'capability_id requerido' },
          { status: 400 }
        );
      }

      const body = toggleRequestSchema.parse(await request.json());
      const organizationScope = await resolveCapabilityOrganizationId({
        request,
        auth,
        organizationIdFromBody: body.organization_id,
      });
      if (!organizationScope.ok) {
        return organizationScope.response;
      }
      const organizationId = organizationScope.organizationId;

      await CapabilityService.updateInstalledCapability({
        organizationId,
        capabilityId,
        userId: auth.uid,
        enabled: body.enabled,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      return capabilityErrorResponse(
        error,
        'No se pudo actualizar el estado de la capability',
        '[capabilities/[id]/toggle][PUT] Error:'
      );
    }
  },
  { roles: ['admin'] }
);
