import { withAuth } from '@/lib/api/withAuth';
import { updateCapabilitySettingsRequestSchema } from '@/lib/validations/plugins';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  capabilityErrorResponse,
  resolveCapabilityId,
  resolveCapabilityOrganizationId,
} from '../../_shared';

const updateSettingsRequestSchema = updateCapabilitySettingsRequestSchema.omit({
  capability_id: true,
});

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

      const body = updateSettingsRequestSchema.parse(await request.json());
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
        settings: body.settings,
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
        'No se pudo actualizar la configuracion de la capability',
        '[capabilities/[id]/settings][PUT] Error:'
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
