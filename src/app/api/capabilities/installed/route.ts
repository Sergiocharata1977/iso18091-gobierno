import {
  installCapabilityRequestSchema,
  updateInstalledCapabilityRequestSchema,
} from '@/lib/validations/plugins';
import { withAuth } from '@/lib/api/withAuth';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgId =
        request.nextUrl.searchParams.get('organization_id') ||
        auth.organizationId;
      const systemId =
        request.nextUrl.searchParams.get('system_id') || undefined;
      if (!orgId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      if (auth.role !== 'super_admin' && orgId !== auth.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden organization' },
          { status: 403 }
        );
      }

      const [installedCapabilities, platformCapabilities] = await Promise.all([
        CapabilityService.getInstalledCapabilities(orgId),
        CapabilityService.getPlatformCapabilities({ systemId }),
      ]);
      const platformById = new Map(
        platformCapabilities.map(capability => [capability.id, capability])
      );
      const data = installedCapabilities
        .filter(capability => {
          if (!systemId) return true;
          return capability.system_id === systemId;
        })
        .map(capability => ({
          ...capability,
          platform_capability:
            platformById.get(capability.capability_id) || null,
        }));
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[capabilities/installed][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las capabilities' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = installCapabilityRequestSchema.parse(await request.json());
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
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

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[capabilities/installed][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo instalar la capability' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, _context, auth) => {
    try {
      const body = updateInstalledCapabilityRequestSchema.parse(
        await request.json()
      );
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      await CapabilityService.updateInstalledCapability({
        organizationId,
        capabilityId: body.capability_id,
        userId: auth.uid,
        enabled: body.enabled,
        settings: body.settings,
        systemId: body.system_id,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[capabilities/installed][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la capability' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
