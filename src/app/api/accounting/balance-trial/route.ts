import { withAuth } from '@/lib/api/withAuth';
import { getBalanceTrialResult, roundAmount } from '@/lib/accounting/reporting';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodo = searchParams.get('periodo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');
    const pluginId = searchParams.get('plugin_id');
    const terceroId = searchParams.get('tercero_id');

    const result = await getBalanceTrialResult({
      organizationId: auth.organizationId,
      periodo,
      desde,
      hasta,
      pluginId,
      terceroId,
      status: 'posted',
    });
    const data = result.rows;

    const totals = data.reduce(
      (acc, row) => {
        acc.total_debe += row.total_debe;
        acc.total_haber += row.total_haber;
        return acc;
      },
      { total_debe: 0, total_haber: 0 }
    );

    return NextResponse.json({
      data,
      totals: {
        total_debe: roundAmount(totals.total_debe),
        total_haber: roundAmount(totals.total_haber),
      },
      filters: {
        periodo,
        desde,
        hasta,
        plugin_id: pluginId,
        tercero_id: terceroId,
        status: 'posted',
      },
      performance: {
        source: result.source,
        snapshot_periodo: result.snapshot_periodo || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'No se pudo obtener el balance de sumas y saldos',
        details: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 500 }
    );
  }
});
