import { withAuth } from '@/lib/api/withAuth';
import { EVENTS } from '@/lib/analytics/events';
import { captureServerEvent } from '@/lib/analytics/server';
import { installCapabilityRequestSchema } from '@/lib/validations/plugins';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveCapabilityOrganizationId } from '../_shared';

const InstallCapabilitySchema = z
  .object({
    organization_id: z.string().optional(),
    organizationId: z.string().optional(),
    capability_id: z.string().optional(),
    capabilityId: z.string().optional(),
    system_id: z.string().optional(),
    systemId: z.string().optional(),
    enabled: z.boolean().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    industry_type: z.string().nullable().optional(),
    industryType: z.string().nullable().optional(),
    submodules_enabled: z.array(z.string()).optional(),
    submodulesEnabled: z.array(z.string()).optional(),
  })
  .transform(body =>
    installCapabilityRequestSchema.parse({
      organization_id: body.organization_id || body.organizationId,
      capability_id: body.capability_id || body.capabilityId,
      system_id: body.system_id || body.systemId,
      enabled: body.enabled,
      settings: body.settings,
      industry_type: body.industry_type ?? body.industryType,
      submodules_enabled:
        body.submodules_enabled || body.submodulesEnabled || [],
    })
  );

export const dynamic = 'force-dynamic';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = InstallCapabilitySchema.parse(await request.json());
      const organizationScope = await resolveCapabilityOrganizationId({
        request,
        auth,
        organizationIdFromBody: body.organization_id,
      });
      if (!organizationScope.ok) {
        return organizationScope.response;
      }
      const organizationId = organizationScope.organizationId;

      const [platformCapability, currentInstalled] = await Promise.all([
        CapabilityService.getPlatformCapability(body.capability_id),
        CapabilityService.getInstalledCapability(
          organizationId,
          body.capability_id
        ),
      ]);

      if (!platformCapability) {
        return NextResponse.json(
          { success: false, error: 'Capability no encontrada' },
          { status: 404 }
        );
      }

      const supportsSystem =
        platformCapability.system_ids.includes('*') ||
        platformCapability.system_ids.includes(body.system_id);

      if (!supportsSystem) {
        return NextResponse.json(
          {
            success: false,
            error: 'La capability no pertenece al system_id solicitado',
          },
          { status: 400 }
        );
      }

      if (currentInstalled) {
        return NextResponse.json(
          { success: false, error: 'La capability ya esta instalada' },
          { status: 409 }
        );
      }

      await CapabilityService.installCapability({
        organizationId,
        capabilityId: body.capability_id,
        systemId: body.system_id,
        userId: auth.uid,
        enabled: body.enabled,
        settings: body.settings,
        industryType: body.industry_type,
        submodulesEnabled: body.submodules_enabled,
      });

      const installedCapability =
        await CapabilityService.getInstalledCapability(
          organizationId,
          body.capability_id
        );

      try {
        await captureServerEvent({
          event: EVENTS.CAPABILITY_INSTALLED,
          distinctId: auth.uid,
          organizationId,
          properties: {
            capability: body.capability_id,
            systemId: body.system_id,
            enabled: body.enabled ?? true,
          },
        });

        if (body.capability_id === 'crm') {
          await captureServerEvent({
            event: EVENTS.CRM_PLUGIN_INSTALLED,
            distinctId: auth.uid,
            organizationId,
            properties: {
              capability: body.capability_id,
              systemId: body.system_id,
              enabled: body.enabled ?? true,
            },
          });
        }
      } catch (analyticsError) {
        console.warn(
          '[capabilities/install][POST] Analytics warning:',
          analyticsError
        );
      }

      return NextResponse.json(
        { success: true, data: installedCapability },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      if (
        error instanceof Error &&
        error.message.startsWith('Missing capability dependencies:')
      ) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }

      console.error('[capabilities/install][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo instalar la capability',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin'] }
);
