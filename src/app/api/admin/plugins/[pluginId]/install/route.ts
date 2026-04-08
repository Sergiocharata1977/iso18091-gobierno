import { withAuth } from '@/lib/api/withAuth';
import { PluginLifecycleService } from '@/lib/plugins/PluginLifecycleService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const installPluginSchema = z.object({
  organization_id: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

function pluginErrorResponse(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: 'Payload invalido', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('Invalid type for plugin setting')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (
      error.message.includes('already installed') ||
      error.message.includes('Missing required capabilities:') ||
      error.message.includes('Incompatible plugins installed:') ||
      error.message.includes('Invalid plugin setting')
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
  }

  console.error('[admin/plugins/install][POST] Error:', error);
  return NextResponse.json(
    { success: false, error: 'No se pudo instalar el plugin' },
    { status: 500 }
  );
}

export const POST = withAuth(
  async (request, context, auth) => {
    try {
      const { pluginId } = await context.params;
      if (!pluginId) {
        return NextResponse.json(
          { success: false, error: 'pluginId requerido' },
          { status: 400 }
        );
      }

      const body = installPluginSchema.parse(await request.json().catch(() => ({})));
      const requestedOrganizationId = body.organization_id || body.organizationId;

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

      const installed = await PluginLifecycleService.installPlugin({
        organizationId: orgScope.organizationId,
        pluginId,
        userId: auth.uid,
        settings: body.settings,
      });

      return NextResponse.json(
        { success: true, data: installed },
        { status: 201 }
      );
    } catch (error) {
      return pluginErrorResponse(error);
    }
  },
  { roles: ['admin'] }
);
