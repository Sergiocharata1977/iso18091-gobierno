import { withAuth } from '@/lib/api/withAuth';
import { HistoricoService } from '@/services/crm/HistoricoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, _auth) => {
    try {
      const { clienteId } = await params;
      const { searchParams } = new URL(request.url);
      const tipo = searchParams.get('tipo') || undefined;
      const limite = parseInt(searchParams.get('limite') || '12');

      const snapshots = await HistoricoService.getFinancialSnapshots(
        clienteId,
        tipo,
        limite
      );
      return NextResponse.json({
        success: true,
        data: snapshots,
        count: snapshots.length,
      });
    } catch (error: any) {
      console.error(
        'Error in GET /api/crm/historico/[clienteId]/financial:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get snapshots' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { clienteId } = await params;
      const body = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? body.organizationId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organizationId es requerido' },
          { status: 400 }
        );
      }
      if (!body.tipoSnapshot || !body.periodo) {
        return NextResponse.json(
          { success: false, error: 'tipoSnapshot y periodo son requeridos' },
          { status: 400 }
        );
      }

      const snapshotId = await HistoricoService.addFinancialSnapshot(
        organizationId,
        clienteId,
        {
          tipoSnapshot: body.tipoSnapshot,
          periodo: body.periodo,
          situacionPatrimonial: body.situacionPatrimonial,
          estadoResultados: body.estadoResultados,
          declaracionMensual: body.declaracionMensual,
          documentoUrl: body.documentoUrl,
          fuenteDatos: body.fuenteDatos || 'declaracion_jurada',
        },
        {
          userId: auth.uid,
          nombre: body.registradoPor?.nombre || auth.email || 'Sistema',
        }
      );

      return NextResponse.json({
        success: true,
        data: { id: snapshotId },
        message: 'Snapshot financiero agregado exitosamente',
      });
    } catch (error: any) {
      console.error(
        'Error in POST /api/crm/historico/[clienteId]/financial:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to add snapshot' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
