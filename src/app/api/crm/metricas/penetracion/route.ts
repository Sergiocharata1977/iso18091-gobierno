import { withAuth } from '@/lib/api/withAuth';
import { PenetracionMercadoService } from '@/services/crm/PenetracionMercadoService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const fechaFin =
        searchParams.get('fecha_fin') || new Date().toISOString();
      const fechaInicio =
        searchParams.get('fecha_inicio') ||
        (() => {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - 30);
          return fecha.toISOString();
        })();

      const metricas = await PenetracionMercadoService.calcularMetricas(
        fechaInicio,
        fechaFin
      );
      return NextResponse.json({ success: true, data: metricas });
    } catch (error: any) {
      console.error('Error in GET /api/crm/metricas/penetracion:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to calculate metricas',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
