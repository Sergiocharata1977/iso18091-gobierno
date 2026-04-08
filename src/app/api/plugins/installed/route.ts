import { withAuth } from '@/lib/api/withAuth';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgId =
        request.nextUrl.searchParams.get('organization_id') ||
        auth.organizationId;

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

      const installed = await PluginLifecycleService.listInstalledPlugins(orgId);

      return NextResponse.json({ success: true, data: installed });
    } catch (error) {
      console.error('[plugins/installed][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los plugins instalados' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
