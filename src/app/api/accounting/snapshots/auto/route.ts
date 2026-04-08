import { SnapshotService } from '@/lib/accounting/SnapshotService';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const autoSnapshotSchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  max_periods: z.coerce.number().int().positive().max(120).optional(),
});

function resolveInternalSnapshotSecret(): string {
  return (
    process.env.ACCOUNTING_SNAPSHOT_CRON_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.AI_INTERNAL_API_SECRET ||
    ''
  );
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = resolveInternalSnapshotSecret();
    const providedSecret =
      request.headers.get('x-internal-webhook-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para ejecutar snapshots automáticos' },
        { status: 401 }
      );
    }

    const body = autoSnapshotSchema.parse(
      request.headers.get('content-type')?.includes('application/json')
        ? await request.json()
        : {}
    );

    const result = await SnapshotService.generateMissingMonthlySnapshots({
      organizationId: body.organization_id,
      generatedBy: 'system:cron',
      maxPeriods: body.max_periods,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Payload invalido', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron generar snapshots automáticos',
      },
      { status: 500 }
    );
  }
}
