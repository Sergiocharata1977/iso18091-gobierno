import { withAuth } from '@/lib/api/withAuth';
import { HistoricoService } from '@/services/crm/HistoricoService';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, _auth) => {
    try {
      const { clienteId } = await params;
      const { searchParams } = new URL(request.url);
      const limite = parseInt(searchParams.get('limite') || '10');

      const consultas = await HistoricoService.getConsultasNosis(
        clienteId,
        limite
      );
      return NextResponse.json({
        success: true,
        data: consultas,
        count: consultas.length,
      });
    } catch (error: any) {
      console.error(
        'Error in GET /api/crm/historico/[clienteId]/nosis:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get consultas' },
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
      if (!body.cuit || !body.tipoConsulta) {
        return NextResponse.json(
          { success: false, error: 'cuit y tipoConsulta son requeridos' },
          { status: 400 }
        );
      }

      const consultaId = await HistoricoService.logConsultaNosis(
        organizationId,
        clienteId,
        {
          cuit: body.cuit,
          fechaConsulta: new Date().toISOString(),
          tipoConsulta: body.tipoConsulta,
          requestEnviado: body.requestEnviado,
          responseRecibido: body.responseRecibido,
          scoreObtenido: body.scoreObtenido,
          situacionBcra: body.situacionBcra,
          chequesRechazados: body.chequesRechazados,
          juiciosActivos: body.juiciosActivos,
          estado: body.estado || 'exitoso',
          errorMensaje: body.errorMensaje,
          tiempoRespuestaMs: body.tiempoRespuestaMs || 0,
          apiKeyUsada: body.apiKeyUsada || '****',
          solicitadoPor: {
            userId: auth.uid,
            nombre: body.solicitadoPor?.nombre || auth.email || 'Sistema',
          },
        }
      );

      return NextResponse.json({
        success: true,
        data: { id: consultaId },
        message: 'Consulta Nosis registrada exitosamente',
      });
    } catch (error: any) {
      console.error(
        'Error in POST /api/crm/historico/[clienteId]/nosis:',
        error
      );
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to log consulta' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
