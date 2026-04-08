import { withAuth } from '@/lib/api/withAuth';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  organization_id: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
});

export const DELETE = withAuth(
  async (request, context, auth) => {
    try {
      const { pluginId } = await context.params;
      if (!pluginId) {
        return NextResponse.json(
          { success: false, error: 'pluginId requerido' },
          { status: 400 }
        );
      }

      const bodyText = await request.text();
      const body = bodySchema.parse(
        bodyText.length ? JSON.parse(bodyText) : {}
      );

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organization_id || body.organizationId,
        { requireOrg: true }
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const installed = await PluginLifecycleService.uninstallPlugin({
        organizationId: orgScope.organizationId,
        pluginId,
        userId: auth.uid,
      });

      return NextResponse.json({ success: true, data: installed });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }

      console.error('[admin/plugins/uninstall][DELETE] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo desinstalar el plugin' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
