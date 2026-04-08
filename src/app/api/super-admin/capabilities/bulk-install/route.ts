import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { normalizeTenantType } from '@/lib/onboarding/validatePhase';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BulkInstallSchema = z.object({
  capability_id: z.string().min(1).default('crm'),
  system_id: z.string().min(1).default('iso9001'),
  organization_ids: z.array(z.string().min(1)).optional(),
  tenant_type: z.enum(['dealer', 'pyme', 'government', 'iso_puro']).optional(),
  only_missing: z.boolean().optional().default(true),
});

export const POST = withAuth(async (request, _context, auth) => {
  try {
    const body = BulkInstallSchema.parse(await request.json());

    if (body.capability_id !== 'crm') {
      return NextResponse.json(
        {
          success: false,
          error: 'Este endpoint actualmente solo soporta la instalacion masiva de CRM',
        },
        { status: 400 }
      );
    }

    const platformCapability = await CapabilityService.getPlatformCapability(
      body.capability_id
    );

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

    const db = getAdminFirestore();
    const organizationsSnapshot = await db.collection('organizations').get();

    const candidateOrganizations = organizationsSnapshot.docs
      .map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          name: typeof data.name === 'string' ? data.name : doc.id,
          tenantType: normalizeTenantType(data.tenant_type ?? data.tenantType),
        };
      })
      .filter(org => {
        if (body.organization_ids?.length) {
          return body.organization_ids.includes(org.id);
        }

        if (body.tenant_type) {
          return org.tenantType === body.tenant_type;
        }

        return true;
      });

    const results: Array<{
      organization_id: string;
      name: string;
      outcome: 'installed' | 'already_installed' | 'failed';
      error?: string;
    }> = [];

    for (const organization of candidateOrganizations) {
      try {
        const installedCapability =
          await CapabilityService.getInstalledCapability(
            organization.id,
            body.capability_id
          );

        if (installedCapability && body.only_missing) {
          results.push({
            organization_id: organization.id,
            name: organization.name,
            outcome: 'already_installed',
          });
          continue;
        }

        if (!installedCapability) {
          await CapabilityService.installCapability({
            organizationId: organization.id,
            capabilityId: body.capability_id,
            systemId: body.system_id,
            userId: auth.uid,
            enabled: true,
          });

          results.push({
            organization_id: organization.id,
            name: organization.name,
            outcome: 'installed',
          });
          continue;
        }

        await CapabilityService.updateInstalledCapability({
          organizationId: organization.id,
          capabilityId: body.capability_id,
          userId: auth.uid,
          enabled: true,
          systemId: body.system_id,
        });

        results.push({
          organization_id: organization.id,
          name: organization.name,
          outcome: 'installed',
        });
      } catch (error) {
        results.push({
          organization_id: organization.id,
          name: organization.name,
          outcome: 'failed',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        capability_id: body.capability_id,
        system_id: body.system_id,
        tenant_type: body.tenant_type ?? null,
        totals: {
          requested: candidateOrganizations.length,
          installed: results.filter(item => item.outcome === 'installed').length,
          already_installed: results.filter(
            item => item.outcome === 'already_installed'
          ).length,
          failed: results.filter(item => item.outcome === 'failed').length,
        },
        results,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Payload invalido', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[super-admin/capabilities/bulk-install][POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo ejecutar la instalacion masiva',
      },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
