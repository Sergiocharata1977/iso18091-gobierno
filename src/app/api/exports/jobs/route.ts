import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { ExportService } from '@/services/exports/ExportService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CreateExportJobSchema = z.object({
  organization_id: z.string().optional(),
  system_id: z.string().default('iso9001'),
  dataset_key: z.string().min(1),
  format: z.enum(['csv', 'json', 'xlsx', 'txt']),
  filters: z.record(z.string(), z.unknown()).default({}),
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
      const data = await ExportService.listJobs(organizationId);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[exports/jobs][GET] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron obtener jobs',
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
      const body = CreateExportJobSchema.parse(await request.json());
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

      const job = await ExportService.createJob({
        organizationId,
        systemId: body.system_id,
        userId: auth.uid,
        userEmail: auth.email,
        userRole: auth.role,
        datasetKey: body.dataset_key,
        format: body.format,
        filters: body.filters,
      });

      const runSync = await ExportService.shouldRunSynchronously({
        organizationId,
        datasetKey: body.dataset_key,
        filters: body.filters,
      });

      if (runSync) {
        const run = await ExportService.runJob({
          organizationId,
          jobId: job.id,
          userEmail: auth.email,
          userRole: auth.role,
        });
        return NextResponse.json(
          { success: true, data: { job, run, mode: 'sync' } },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            job,
            mode: 'queued',
            message:
              'El dataset excede el limite sincrono. Ejecuta el runner para procesarlo.',
          },
        },
        { status: 202 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[exports/jobs][POST] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo crear el export job',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);
