import { withAuth } from '@/lib/api/withAuth';
import { getAccountingEntriesWithLines } from '@/lib/accounting/reporting';
import { NextResponse } from 'next/server';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export const GET = withAuth(async request => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organization_id') || undefined;

    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get('page_size'), 20),
      100
    );
    const periodo = searchParams.get('periodo');
    const pluginId = searchParams.get('plugin_id');
    const status = searchParams.get('status');
    const terceroId = searchParams.get('tercero_id');

    const entries = await getAccountingEntriesWithLines({
      organizationId: organizationId || '',
      periodo,
      pluginId,
      status: status as any,
      terceroId,
    });

    const total = entries.length;
    const start = (page - 1) * pageSize;
    const data = entries.slice(start, start + pageSize);

    return NextResponse.json({
      data,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
      filters: {
        periodo,
        plugin_id: pluginId,
        status,
        tercero_id: terceroId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'No se pudo obtener el libro diario',
        details: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 500 }
    );
  }
});
