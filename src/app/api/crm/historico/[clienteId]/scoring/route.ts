import { withAuth } from '@/lib/api/withAuth';
import { HistoricoService } from '@/services/crm/HistoricoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, _auth) => {
    try {
      const { clienteId } = await params;
      const { searchParams } = new URL(request.url);
      const soloVigente = searchParams.get('vigente') === 'true';
      const limite = parseInt(searchParams.get('limite') || '10');

      if (soloVigente) {
        const scoring =
          await HistoricoService.getUltimoScoringVigente(clienteId);
        return NextResponse.json({ success: true, data: scoring });
      }

      const historial = await HistoricoService.getScoringHistory(
        clienteId,
        limite
      );
      return NextResponse.json({
        success: true,
        data: historial,
        count: historial.length,
      });
    } catch (error: any) {
      console.error(
        'Error in GET /api/crm/historico/[clienteId]/scoring:',
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to get scoring history',
        },
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
      if (!body.factoresEvaluados || !body.snapshotDatos) {
        return NextResponse.json(
          {
            success: false,
            error: 'factoresEvaluados y snapshotDatos son requeridos',
          },
          { status: 400 }
        );
      }

      await HistoricoService.addScoringRecord(
        organizationId,
        clienteId,
        {
          factoresEvaluados: body.factoresEvaluados,
          snapshotDatos: body.snapshotDatos,
          vigenciaDias: body.vigenciaDias,
        },
        {
          userId: auth.uid,
          nombre: body.evaluadoPor?.nombre || auth.email || 'Sistema',
        }
      );

      const historial = await HistoricoService.getScoringHistory(clienteId, 1);
      return NextResponse.json({
        success: true,
        data: historial[0],
        message: 'Evaluacion de scoring registrada exitosamente',
      });
    } catch (error: any) {
      console.error(
        'Error in POST /api/crm/historico/[clienteId]/scoring:',
        error
      );
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to add scoring record',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
