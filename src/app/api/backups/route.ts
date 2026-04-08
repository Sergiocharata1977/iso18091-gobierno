import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { BackupService } from '@/services/exports/BackupService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CreateBackupSchema = z.object({
  organization_id: z.string().optional(),
  system_id: z.string().default('iso9001'),
  datasets: z.array(z.string()).default([]),
  format: z.enum(['json', 'xlsx']).default('json'),
  retention_days: z.number().int().min(1).max(365).optional(),
  max_backups: z.number().int().min(1).max(200).optional(),
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
      const data = await BackupService.listSnapshots(organizationId);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[backups][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener backups',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = CreateBackupSchema.parse(await request.json());
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

      const data = await BackupService.createSnapshot({
        organizationId,
        systemId: body.system_id,
        userId: auth.uid,
        datasets: body.datasets,
        format: body.format,
        retentionDays: body.retention_days,
        maxBackups: body.max_backups,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[backups][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo crear el backup',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);
