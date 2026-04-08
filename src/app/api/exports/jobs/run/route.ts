import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { ExportService } from '@/services/exports/ExportService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const RunJobSchema = z.object({
  organization_id: z.string().optional(),
  job_id: z.string().min(1),
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = RunJobSchema.parse(await request.json());
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
      const run = await ExportService.runJob({
        organizationId,
        jobId: body.job_id,
        userEmail: auth.email,
        userRole: auth.role,
      });
      return NextResponse.json({ success: true, data: run });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[exports/jobs/run] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo ejecutar el job',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'super_admin'] }
);
