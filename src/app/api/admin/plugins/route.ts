import { withAuth } from '@/lib/api/withAuth';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
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

      const manifests = await PluginLifecycleService.listCatalogManifests();
      return NextResponse.json({ success: true, data: manifests });
    } catch (error) {
      console.error('[admin/plugins][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo listar el catalogo de plugins' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
