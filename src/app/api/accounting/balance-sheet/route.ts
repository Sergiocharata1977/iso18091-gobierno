import { withAuth } from '@/lib/api/withAuth';
import { getBalanceSheet } from '@/lib/accounting/reporting';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, _context, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodo = searchParams.get('periodo');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const data = await getBalanceSheet({
      organizationId: auth.organizationId,
      periodo,
      desde,
      hasta,
      status: 'posted',
    });

    return NextResponse.json({
      data,
      filters: { periodo, desde, hasta, status: 'posted' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'No se pudo obtener el balance general',
        details: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 500 }
    );
  }
});
