import { withAuth } from '@/lib/api/withAuth';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, context, auth) => {
    try {
      const { pluginId } = await context.params;
      if (!pluginId) {
        return NextResponse.json(
          { success: false, error: 'pluginId requerido' },
          { status: 400 }
        );
      }

      const requestedOrganizationId =
        request.nextUrl.searchParams.get('organization_id') || undefined;

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        requestedOrganizationId,
        { requireOrg: true }
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const manifest = await PluginLifecycleService.getCatalogManifest(pluginId);
      if (!manifest) {
        return NextResponse.json(
          { success: false, error: 'Plugin no encontrado' },
          { status: 404 }
        );
      }

      const installed = await PluginLifecycleService.getInstalledPlugin(
        orgScope.organizationId,
        pluginId
      );

      return NextResponse.json({
        success: true,
        data: { manifest, installed },
      });
    } catch (error) {
      console.error('[admin/plugins/[pluginId]][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el detalle del plugin' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
