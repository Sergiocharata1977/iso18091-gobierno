import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { RestoreService } from '@/services/exports/RestoreService';
import { CapabilityService } from '@/services/plugins/CapabilityService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const StartRestoreSchema = z.object({
  organization_id: z.string().optional(),
  system_id: z.string().default('iso9001'),
  snapshot_id: z.string().min(1),
  mode: z.enum(['staging', 'restore_missing']),
});

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
      const data = await RestoreService.listRuns(organizationId);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[restores][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener restores',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = StartRestoreSchema.parse(await request.json());
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      await requireCapability(organizationId, 'data-export-backup');

      await CapabilityService.logCapabilityAudit(organizationId, {
        capability_id: 'data-export-backup',
        action: 'restore_started',
        performed_by: auth.uid,
        performed_at: new Date(),
        details: {
          snapshot_id: body.snapshot_id,
          mode: body.mode,
        },
        previous_state: null,
      });

      const data = await RestoreService.startRestore({
        organizationId,
        systemId: body.system_id,
        userId: auth.uid,
        snapshotId: body.snapshot_id,
        mode: body.mode,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[restores][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo iniciar restore',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
