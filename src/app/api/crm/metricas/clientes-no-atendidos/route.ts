import { withAuth } from '@/lib/api/withAuth';
import { PenetracionMercadoService } from '@/services/crm/PenetracionMercadoService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const orgParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? orgParam || auth.organizationId
          : auth.organizationId;
      const clientesNoAtendidos =
        await PenetracionMercadoService.getClientesNoAtendidos();

      return NextResponse.json({
        success: true,
        data: clientesNoAtendidos,
        count: clientesNoAtendidos.length,
      });
    } catch (error: any) {
      console.error(
        'Error in GET /api/crm/metricas/clientes-no-atendidos:',
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to fetch clientes no atendidos',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
