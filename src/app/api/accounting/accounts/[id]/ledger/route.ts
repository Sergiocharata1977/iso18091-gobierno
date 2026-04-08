import { withAuth } from '@/lib/api/withAuth';
import { getAccountLedger } from '@/lib/accounting/reporting';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, context, auth) => {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const ledger = await getAccountLedger(auth.organizationId, id, desde, hasta);

    if (!ledger) {
      return NextResponse.json(
        { error: 'Cuenta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      account: ledger.account,
      data: ledger.rows,
      filters: { desde, hasta },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'No se pudo obtener el mayor de la cuenta',
        details: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 500 }
    );
  }
});
