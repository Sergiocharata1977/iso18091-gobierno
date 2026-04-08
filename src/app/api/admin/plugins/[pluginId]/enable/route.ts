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

      const body = bodySchema.parse(await request.json().catch(() => ({})));
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

      const installed = await PluginLifecycleService.enablePlugin({
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

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 404 }
          );
        }

        if (
          error.message.includes('health is not OK') ||
          error.message.includes('billing is not OK')
        ) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 409 }
          );
        }
      }

      console.error('[admin/plugins/enable][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo habilitar el plugin' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin'] }
);
