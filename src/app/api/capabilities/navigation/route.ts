import { withAuth } from '@/lib/api/withAuth';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      if (!auth.organizationId && auth.role !== 'super_admin') {
        return NextResponse.json({ success: true, data: [] });
      }

      const capabilities = auth.organizationId
        ? await CapabilityService.getInstalledCapabilities(auth.organizationId)
        : [];

      const entries = [];
      for (const installed of capabilities) {
        if (!installed.enabled || installed.status !== 'enabled') continue;
        const platformCapability =
          await CapabilityService.getPlatformCapability(
            installed.capability_id
          );
        if (!platformCapability?.manifest?.navigation?.length) continue;
        entries.push(...platformCapability.manifest.navigation);
      }

      return NextResponse.json({ success: true, data: entries });
    } catch (error) {
      console.error('[capabilities/navigation] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo resolver la navegacion' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'],
    allowNoOrg: true,
  }
);
