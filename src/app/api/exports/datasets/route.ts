import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { ExportService } from '@/services/exports/ExportService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const organizationId =
        request.nextUrl.searchParams.get('organization_id') ||
        auth.organizationId;

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

      await requireCapability(organizationId, 'data-export-backup');
      const data = await ExportService.listAvailableDatasets({
        organizationId,
        systemId: request.nextUrl.searchParams.get('system_id') || 'iso9001',
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[exports/datasets] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron listar datasets',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);
