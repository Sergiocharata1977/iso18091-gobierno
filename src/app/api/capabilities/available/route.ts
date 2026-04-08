import { withAuth } from '@/lib/api/withAuth';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationId =
        request.nextUrl.searchParams.get('organization_id') ||
        auth.organizationId;
      const systemId =
        request.nextUrl.searchParams.get('system_id') || undefined;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        organizationId !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden organization' },
          { status: 403 }
        );
      }

      const data = await CapabilityService.getAvailableCapabilities({
        organizationId,
        systemId,
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[capabilities/available][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener las capabilities disponibles',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
