import { withAuth } from '@/lib/api/withAuth';
import { AgentWorkerService } from '@/services/agents/AgentWorkerService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Ejecuta procesamiento de jobs pendientes del worker de agentes.
 */
export const POST = withAuth(async (request, _context, _auth) => {
  try {
    const body = await request.json().catch(() => ({}));
    const rawLimit = Number(body?.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(50, rawLimit))
      : 10;

    const processed = await AgentWorkerService.processPendingJobs(limit);

    return NextResponse.json({
      ok: true,
      processed,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /agents/process] Error procesando jobs:', error);
    return NextResponse.json(
      { error: 'Error al procesar jobs de agentes' },
      { status: 500 }
    );
  }
});
